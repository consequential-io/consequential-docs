/**
 * docs.consequential.io Worker — static assets, plus a same-origin proxy for
 * the API reference's "Test Request" console.
 *
 * Why a proxy: the console runs in the reader's browser on
 * docs.consequential.io and calls core cross-origin. Core's CORS allowlist
 * does not include this site — a preflight from it gets a 500 with no
 * `Access-Control-Allow-Origin` — so every request failed with a bare
 * "Failed to fetch". Routing through this same-origin path means the browser
 * never makes a cross-origin call, and core sees an ordinary server-to-server
 * request, the same as curl.
 *
 * Scalar's protocol (see `proxyUrl` in `src/components/ScalarApiReference.astro`):
 * the client calls `/scalar-proxy?scalar_url=<absolute target URL>`, and sends
 * headers a browser will not let a page set (`Cookie`, `User-Agent`, …) as
 * `X-Scalar-<name>`. On the way back it renames any `X-Scalar-Original-<name>`
 * response header to `<name>` for display.
 *
 * Everything else is served from `dist/` exactly as before: `wrangler.jsonc`
 * runs this Worker first only for `/scalar-proxy`, so for every other path the
 * Worker is reached only when no asset matched, and hands straight back to the
 * asset layer for its normal 404.
 */

import { ALLOWED_ORIGINS, PROXY_PATH } from './config.js';

/** Only core's API, never the app or anything else served on those hosts. */
const ALLOWED_PATH_PREFIX = '/api/';

/**
 * Request headers that describe the reader's visit to the docs site, not the
 * API call. `Origin` matters most: forwarded, it trips core's CORS check —
 * the very failure this proxy exists to avoid. `Cookie` would leak the docs
 * site's own cookies upstream.
 */
const DROPPED_REQUEST_HEADERS = [
	'host',
	'origin',
	'referer',
	'cookie',
	'content-length',
	'connection',
	'keep-alive',
	'upgrade',
	'te',
	'trailer',
	'transfer-encoding',
	'x-real-ip',
	'true-client-ip',
];
const DROPPED_REQUEST_PREFIXES = ['cf-', 'x-forwarded-', 'sec-'];

/** Headers Scalar sends under an `X-Scalar-` alias because a page cannot set them. */
const SCALAR_REQUEST_ALIASES = {
	'x-scalar-cookie': 'cookie',
	'x-scalar-user-agent': 'user-agent',
	'x-scalar-referer': 'referer',
	'x-scalar-dnt': 'dnt',
	'x-scalar-date': 'date',
};

/**
 * Response headers the browser would act on rather than show. Returned as-is,
 * `Set-Cookie` would store core's session cookies against docs.consequential.io
 * and `Location` would make the browser follow a redirect the reader asked to
 * inspect. Renamed, Scalar still displays them under their real names.
 */
const RENAMED_RESPONSE_HEADERS = ['set-cookie', 'location'];

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		if (url.pathname === PROXY_PATH) {
			return proxy(request, url);
		}
		return env.ASSETS.fetch(request);
	},
};

async function proxy(request, url) {
	let target;
	try {
		target = new URL(url.searchParams.get('scalar_url') ?? '');
	} catch {
		return errorResponse(400, 'Missing or invalid scalar_url parameter.');
	}

	if (
		!ALLOWED_ORIGINS.has(target.origin) ||
		!target.pathname.startsWith(ALLOWED_PATH_PREFIX) ||
		target.username ||
		target.password
	) {
		return errorResponse(
			403,
			`The docs console only sends requests to ${[...ALLOWED_ORIGINS].join(' and ')}. ` +
				'For any other server (e.g. a local one), copy the request as cURL instead.'
		);
	}

	const headers = new Headers();
	for (const [name, value] of request.headers) {
		if (
			DROPPED_REQUEST_HEADERS.includes(name) ||
			DROPPED_REQUEST_PREFIXES.some((prefix) => name.startsWith(prefix)) ||
			name.startsWith('x-scalar-')
		) {
			continue;
		}
		headers.set(name, value);
	}
	for (const [alias, name] of Object.entries(SCALAR_REQUEST_ALIASES)) {
		const value = request.headers.get(alias);
		if (value) headers.set(name, value);
	}

	const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

	let upstream;
	try {
		upstream = await fetch(target, {
			method: request.method,
			headers,
			body: hasBody ? await request.arrayBuffer() : undefined,
			redirect: 'manual',
		});
	} catch (error) {
		return errorResponse(502, `Could not reach ${target.origin}: ${error.message}`);
	}

	const responseHeaders = new Headers(upstream.headers);
	for (const name of RENAMED_RESPONSE_HEADERS) {
		const values = name === 'set-cookie' ? upstream.headers.getSetCookie() : [upstream.headers.get(name)];
		responseHeaders.delete(name);
		for (const value of values) {
			if (value) responseHeaders.append(`x-scalar-original-${name}`, value);
		}
	}
	responseHeaders.set('cache-control', 'no-store');

	return new Response(upstream.body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers: responseHeaders,
	});
}

function errorResponse(status, message) {
	return Response.json(
		{ error: message },
		{ status, headers: { 'cache-control': 'no-store' } }
	);
}
