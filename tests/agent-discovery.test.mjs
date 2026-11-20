/**
 * Every docs page tells AI agents where `/llms.txt` is, near the top, in both
 * its HTML and its Markdown twin (`src/lib/agent-discovery.mjs`,
 * `src/components/CustomBanner.astro`). A new route that bypasses Starlight's
 * page layout, or a plugin change that rewrites the twins, would silently drop
 * the pointer; this catches it.
 *
 * Run after `npm run build`:  `node --test tests/agent-discovery.test.mjs`
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import {
	AGENT_INDEX_LEAD,
	markdownAgentHint,
	markdownTwinPath,
	withAgentHint,
} from '../src/lib/agent-discovery.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');

function* walk(dir, suffix) {
	if (!existsSync(dir)) return;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(p, suffix);
		else if (entry.name.endsWith(suffix)) yield p;
	}
}

// `redirects:` stubs are bare meta-refresh documents with no Starlight layout.
const isRedirectStub = (html) => /<meta\s+http-equiv="refresh"/i.test(html);
const isApiPage = (path) => path.split(sep)[0] === 'api';

const pages = [...walk(DIST, '.html')]
	.map((f) => ({ path: relative(DIST, f), html: readFileSync(f, 'utf-8') }))
	.filter(({ html }) => !isRedirectStub(html));
const twins = [...walk(DIST, '.md')].map((f) => ({
	path: relative(DIST, f),
	md: readFileSync(f, 'utf-8'),
}));

/** The `.agent-hint` block's inner HTML, or null. */
function agentHint(html) {
	const m = html.match(/<div class="agent-hint[^"]*"[^>]*>([\s\S]*?)<\/div>/);
	return m ? m[1] : null;
}

test('build output exists (did `npm run build` run?)', () => {
	assert.ok(pages.length > 0, 'no .html pages in dist/');
	assert.ok(twins.length > 0, 'no .md twins in dist/');
});

test('every page links /llms.txt from the agent hint, above the page title', () => {
	const wrong = [];
	for (const { path, html } of pages) {
		const hint = agentHint(html);
		if (!hint || !hint.includes(AGENT_INDEX_LEAD) || !hint.includes('href="/llms.txt"')) {
			wrong.push(`${path} (missing)`);
			continue;
		}
		const hintAt = html.indexOf('class="agent-hint');
		const titleAt = html.indexOf('id="_top"');
		if (titleAt !== -1 && hintAt > titleAt) wrong.push(`${path} (below the title)`);
	}
	assert.equal(wrong.length, 0, `pages without the llms.txt pointer:\n  ${wrong.join('\n  ')}`);
});

test('docs pages link their Markdown twin; API reference pages link the OpenAPI description', () => {
	const wrong = [];
	for (const { path, html } of pages) {
		const hint = agentHint(html) ?? '';
		const twinHref = hint.match(/href="([^"]+\.md)"/)?.[1];
		if (isApiPage(path)) {
			if (twinHref) wrong.push(`${path} links a twin that does not exist: ${twinHref}`);
			if (!hint.includes('href="/api.yaml"')) wrong.push(`${path} does not link /api.yaml`);
		} else if (path !== '404.html') {
			if (!twinHref) wrong.push(`${path} does not link its twin`);
			else if (!existsSync(join(DIST, twinHref.replace(/^\//, ''))))
				wrong.push(`${path} links a missing twin: ${twinHref}`);
		}
	}
	assert.equal(wrong.length, 0, wrong.join('\n'));
});

test('every Markdown twin carries the pointer directly under its H1', () => {
	const wrong = twins
		.filter(({ md }) => {
			const lines = md.split('\n');
			return !lines[0].startsWith('# ') || !lines[2]?.startsWith(`> ${AGENT_INDEX_LEAD} `);
		})
		.map(({ path }) => path);
	assert.equal(wrong.length, 0, `twins without the pointer:\n  ${wrong.join('\n  ')}`);
});

test('withAgentHint keeps the H1 first and is idempotent', () => {
	const hint = markdownAgentHint('https://docs.example.com');
	assert.equal(hint, `> ${AGENT_INDEX_LEAD} https://docs.example.com/llms.txt`);

	const once = withAgentHint('# Title\n\nBody text.\n', hint);
	assert.equal(once, `# Title\n\n${hint}\n\nBody text.\n`);
	assert.equal(withAgentHint(once, hint), once);
	assert.equal(withAgentHint('No heading.\n', hint), `${hint}\n\nNo heading.\n`);
});

test('markdownTwinPath follows the `<url>.md` convention', () => {
	assert.equal(markdownTwinPath('/'), '/index.md');
	assert.equal(markdownTwinPath('/concepts/glossary/'), '/concepts/glossary.md');
	assert.equal(markdownTwinPath('/concepts/glossary'), '/concepts/glossary.md');
});
