/**
 * Contract tests for `dist/page-index.json`, the keyword index the MCP
 * gateway's `search_docs` tool fetches from docs.consequential.io. The gateway
 * matches a query against `title` + `keywords`, then fetches `mdUrl`, so every
 * entry must point at a real `.md` twin and every verified page must be indexed.
 * Pages still carrying the unverified-content caution must stay out.
 *
 * Run after `npm run build`:  `node --test tests/page-index.test.mjs`
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import { UNVERIFIED_MARKER } from '../src/lib/page-index-integration.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const INDEX = join(DIST, 'page-index.json');

function* walk(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(p);
		else if (entry.name.endsWith('.md')) yield p;
	}
}

const entries = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, 'utf-8')) : [];

test('page-index.json exists and is non-empty', () => {
	assert.ok(existsSync(INDEX), 'dist/page-index.json missing — is pageIndexIntegration() registered?');
	assert.ok(entries.length > 0, 'page-index.json has no entries');
});

test('every entry has the shape the gateway reads', () => {
	for (const entry of entries) {
		assert.match(entry.mdUrl, /^\/.+\.md$/, `bad mdUrl: ${entry.mdUrl}`);
		assert.ok(typeof entry.title === 'string' && entry.title.length > 0, `${entry.mdUrl}: empty title`);
		assert.ok(Array.isArray(entry.keywords), `${entry.mdUrl}: keywords is not an array`);
	}
});

test('every mdUrl resolves to a real .md file in dist/', () => {
	const broken = entries.filter((e) => !existsSync(join(DIST, e.mdUrl))).map((e) => e.mdUrl);
	assert.deepEqual(broken, [], `index points at missing files:\n  ${broken.join('\n  ')}`);
});

const twins = [...walk(DIST)].map((p) => ({
	url: '/' + relative(DIST, p).split(sep).join('/'),
	unverified: UNVERIFIED_MARKER.test(readFileSync(p, 'utf-8')),
}));

test('every verified .md twin in dist/ is indexed', () => {
	const indexed = new Set(entries.map((e) => e.mdUrl));
	const unindexed = twins.filter((t) => !t.unverified && !indexed.has(t.url)).map((t) => t.url);
	assert.deepEqual(unindexed, [], `pages search_docs cannot find:\n  ${unindexed.join('\n  ')}`);
});

test('no page with the unverified-content caution is indexed', () => {
	const indexed = new Set(entries.map((e) => e.mdUrl));
	const leaked = twins.filter((t) => t.unverified && indexed.has(t.url)).map((t) => t.url);
	assert.deepEqual(leaked, [], `unverified pages search_docs would answer from:\n  ${leaked.join('\n  ')}`);
});
