/**
 * Every page loads Clarity + PostHog exactly once (`src/components/Analytics.astro`,
 * rendered from `CustomHead.astro`). Pages that bypass Starlight's <head> — a new
 * route file, a layout swap — would silently drop out of both tools; this catches it.
 *
 * The PostHog key comes from `PUBLIC_POSTHOG_KEY` at build time. When it is set, the
 * built pages must carry that key; a build without it ships Clarity only.
 *
 * Run after `npm run build`:  `node --test tests/analytics.test.mjs`
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');

const CLARITY_TAG = 'https://www.clarity.ms/tag/';
const POSTHOG_INIT = 'posthog.init(';
const POSTHOG_KEY = process.env.PUBLIC_POSTHOG_KEY;

function* walk(dir) {
	if (!existsSync(dir)) return;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(p);
		else if (entry.name.endsWith('.html')) yield p;
	}
}

// `redirects:` stubs are bare meta-refresh documents with no Starlight <head>.
const isRedirectStub = (html) => /<meta\s+http-equiv="refresh"/i.test(html);

const count = (html, needle) => html.split(needle).length - 1;

const pages = [...walk(DIST)]
	.map((f) => ({ path: relative(DIST, f), html: readFileSync(f, 'utf-8') }))
	.filter(({ html }) => !isRedirectStub(html));

test('build output exists (did `npm run build` run?)', () => {
	assert.ok(pages.length > 0, 'no .html pages in dist/');
});

test('every page loads Clarity and PostHog exactly once', () => {
	const wrong = pages
		.map(({ path, html }) => ({
			path,
			clarity: count(html, CLARITY_TAG),
			posthog: count(html, POSTHOG_INIT),
		}))
		.filter(({ clarity, posthog }) => clarity !== 1 || posthog !== 1)
		.map(({ path, clarity, posthog }) => `${path} (clarity ${clarity}, posthog ${posthog})`);
	assert.equal(wrong.length, 0, `pages without exactly one of each:\n  ${wrong.join('\n  ')}`);
});

test(
	'every page initialises PostHog with the configured key',
	{ skip: !POSTHOG_KEY && 'PUBLIC_POSTHOG_KEY not set for this build' },
	() => {
		const wrong = pages
			.filter(({ html }) => count(html, JSON.stringify(POSTHOG_KEY)) !== 1)
			.map(({ path }) => path);
		assert.equal(wrong.length, 0, `pages without the key exactly once:\n  ${wrong.join('\n  ')}`);
	},
);
