/**
 * Unit tests for the "Test Request" console proxy (`worker/index.js`).
 *
 * `fetch` and the asset binding are stubbed — no network — so these run in
 * milliseconds alongside the build tests:
 *
 *   node --test tests/scalar-proxy.test.mjs
 */
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalize } from '@scalar/openapi-parser';

import worker from '../worker/index.js';
import { ALLOWED_ORIGINS, PROXY_PATH } from '../worker/config.js';

const realFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = realFetch;
});

/** Record every upstream call and answer each with `response`. */
function stubFetch(response = () => new Response('{}', { status: 200 })) {
	const calls = [];
	globalThis.fetch = async (input, init) => {
		calls.push({ url: String(input), init });
		return response();
	};
	return calls;
}

const env = {
	ASSETS: { fetch: async (request) => new Response(`asset:${new URL(request.url).pathname}`) },
};

const proxied = (target, init) =>
	new Request(
		`https://docs.consequential.io${PROXY_PATH}?scalar_url=${encodeURIComponent(target)}`,
		init
	);

test('non-proxy paths are handed to the asset layer untouched', async () => {
	const calls = stubFetch();
	const response = await worker.fetch(new Request('https://docs.consequential.io/missing'), env);
	assert.equal(await response.text(), 'asset:/missing');
	assert.equal(calls.length, 0);
});

test('forwards method, query and body to an allowed API URL', async () => {
	const calls = stubFetch(() => Response.json({ ok: true }, { status: 201 }));
	const response = await worker.fetch(
		proxied('https://demo.consequential.io/api/v1/auth/magic-link/request?x=1', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{"email":"a@b.co"}',
		}),
		env
	);
	assert.equal(response.status, 201);
	assert.deepEqual(await response.json(), { ok: true });
	assert.equal(calls.length, 1);
	assert.equal(calls[0].url, 'https://demo.consequential.io/api/v1/auth/magic-link/request?x=1');
	assert.equal(calls[0].init.method, 'POST');
	assert.equal(new TextDecoder().decode(calls[0].init.body), '{"email":"a@b.co"}');
	assert.equal(calls[0].init.redirect, 'manual');
});

test('strips docs-site headers — Origin would trip core CORS — and maps X-Scalar aliases', async () => {
	const calls = stubFetch();
	await worker.fetch(
		proxied('https://app.consequential.io/api/v1/tenants/my', {
			headers: {
				origin: 'https://docs.consequential.io',
				referer: 'https://docs.consequential.io/api/',
				cookie: 'ph_session=docs-site',
				'cf-connecting-ip': '203.0.113.9',
				'x-forwarded-for': '203.0.113.9',
				'sec-fetch-site': 'same-origin',
				authorization: 'Bearer abc',
				'x-tenant-id': 't1',
				'x-scalar-cookie': 'refTkn=r1',
				'x-scalar-user-agent': 'Scalar',
			},
		}),
		env
	);
	const sent = calls[0].init.headers;
	for (const name of ['origin', 'referer', 'cf-connecting-ip', 'x-forwarded-for', 'sec-fetch-site', 'x-scalar-cookie']) {
		assert.equal(sent.has(name), false, `${name} should not reach core`);
	}
	assert.equal(sent.get('cookie'), 'refTkn=r1', 'docs cookies replaced by the console-set ones');
	assert.equal(sent.get('user-agent'), 'Scalar');
	assert.equal(sent.get('authorization'), 'Bearer abc');
	assert.equal(sent.get('x-tenant-id'), 't1');
});

test('renames Set-Cookie and Location so the browser shows them instead of acting on them', async () => {
	stubFetch(() => {
		const headers = new Headers({ location: 'https://accounts.google.com/o/oauth2' });
		headers.append('set-cookie', 'refTkn=r1; HttpOnly');
		headers.append('set-cookie', 'sid=s1; HttpOnly');
		return new Response(null, { status: 302, headers });
	});
	const response = await worker.fetch(proxied('https://demo.consequential.io/api/v1/auth/google'), env);
	assert.equal(response.status, 302);
	assert.equal(response.headers.has('location'), false);
	assert.equal(response.headers.getSetCookie().length, 0);
	assert.equal(response.headers.get('x-scalar-original-location'), 'https://accounts.google.com/o/oauth2');
	assert.match(response.headers.get('x-scalar-original-set-cookie'), /refTkn=r1.*sid=s1/);
});

test('refuses anything that is not an allowed host’s /api/ path', async () => {
	const calls = stubFetch();
	const refused = [
		'https://evil.example/api/v1/x',
		'http://demo.consequential.io/api/v1/x',
		'https://demo.consequential.io.evil.example/api/v1/x',
		'https://demo.consequential.io/login',
		'https://user:pass@demo.consequential.io/api/v1/x',
		'http://localhost:4040/api/v1/auth/providers',
	];
	for (const target of refused) {
		const response = await worker.fetch(proxied(target), env);
		assert.equal(response.status, 403, target);
	}
	const missing = await worker.fetch(new Request(`https://docs.consequential.io${PROXY_PATH}`), env);
	assert.equal(missing.status, 400);
	assert.equal(calls.length, 0);
});

test('every hosted server in public/api.yaml is one the proxy forwards to', () => {
	const spec = normalize(readFileSync(new URL('../public/api.yaml', import.meta.url), 'utf8'));
	const hosted = spec.servers
		.map((server) => new URL(server.url))
		.filter((url) => url.hostname !== 'localhost');
	assert.ok(hosted.length > 0);
	for (const url of hosted) {
		assert.ok(ALLOWED_ORIGINS.has(url.origin), `${url.origin} is in api.yaml but not ALLOWED_ORIGINS`);
	}
});
