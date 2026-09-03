/**
 * Unit tests for the bot-PR reviewer selector
 * (`.github/scripts/select-reviewers.mjs`).
 *
 * The selector reads repository history to decide who should look at a PR the
 * Docs Agent opened. Everything here is a stub — no network — so these run in
 * milliseconds alongside the build tests:
 *
 *   node --test tests/select-reviewers.test.mjs
 *
 * The directory-fallback case is not hypothetical: PR #36 edited a page the
 * agent had both created and previously edited, so its file history named no
 * human at all while its section had two.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parentDirectories, selectReviewers } from '../.github/scripts/select-reviewers.mjs';

/** Build a `listAuthorsForPath` from a plain path -> authors object. */
function history(byPath) {
	return async (path) => byPath[path] ?? [];
}

const human = (login, date = '2026-01-01T00:00:00Z') => ({ login, type: 'User', date });
const bot = (login) => ({ login, type: 'Bot', date: '2026-01-01T00:00:00Z' });

test('picks the humans who committed to the exact files', async () => {
	const result = await selectReviewers({
		changedFiles: ['docs/a.mdx', 'docs/b.mdx'],
		listAuthorsForPath: history({
			'docs/a.mdx': [human('ada'), human('grace')],
			'docs/b.mdx': [human('ada')],
		}),
	});

	assert.equal(result.tier, 'file');
	// ada touched both files, grace one — breadth outranks depth.
	assert.deepEqual(result.reviewers, ['ada', 'grace']);
});

test('ranks by files touched first, then by commit count', async () => {
	const result = await selectReviewers({
		changedFiles: ['docs/a.mdx', 'docs/b.mdx'],
		listAuthorsForPath: history({
			// grace has more commits overall, but only on one of the two files.
			'docs/a.mdx': [human('grace'), human('grace'), human('grace'), human('ada')],
			'docs/b.mdx': [human('ada')],
		}),
	});

	assert.deepEqual(result.reviewers, ['ada', 'grace']);
});

test('ignores bots and commits GitHub could not attribute', async () => {
	const result = await selectReviewers({
		changedFiles: ['docs/a.mdx'],
		listAuthorsForPath: history({
			'docs/a.mdx': [
				bot('ekline[bot]'),
				{ login: 'renovate[bot]', type: 'User' }, // app reporting as User
				{ login: undefined, type: 'User' }, // unlinked commit email
				human('ada'),
			],
		}),
	});

	assert.deepEqual(result.reviewers, ['ada']);
});

test('falls back to the directory when a file has no human history', async () => {
	const result = await selectReviewers({
		changedFiles: ['docs/daily-reports/schedule.mdx'],
		listAuthorsForPath: history({
			'docs/daily-reports/schedule.mdx': [bot('ekline[bot]'), bot('ekline[bot]')],
			'docs/daily-reports': [human('ada'), human('grace')],
		}),
	});

	assert.equal(result.tier, 'directory');
	assert.deepEqual(result.reviewers, ['ada', 'grace']);
});

test('never picks the PR author or someone already requested', async () => {
	const result = await selectReviewers({
		changedFiles: ['docs/a.mdx'],
		listAuthorsForPath: history({
			'docs/a.mdx': [human('ada'), human('grace'), human('linus')],
		}),
		prAuthor: 'ada',
		alreadyRequested: ['grace'],
	});

	assert.deepEqual(result.reviewers, ['linus']);
});

test('aliases merge two accounts into one reviewer, and apply before exclusion', async () => {
	const result = await selectReviewers({
		changedFiles: ['docs/a.mdx', 'docs/b.mdx'],
		listAuthorsForPath: history({
			'docs/a.mdx': [human('ada-personal')],
			'docs/b.mdx': [human('ada'), human('grace')],
		}),
		aliases: { 'ada-personal': 'ada' },
	});

	// One reviewer, credited with both files — not two half-scored strangers.
	assert.deepEqual(result.reviewers, ['ada', 'grace']);
	assert.equal(result.considered[0].paths, 2);

	const asAuthor = await selectReviewers({
		changedFiles: ['docs/a.mdx'],
		listAuthorsForPath: history({ 'docs/a.mdx': [human('ada-personal')] }),
		prAuthor: 'ada',
		aliases: { 'ada-personal': 'ada' },
	});

	// The alias resolves to the PR author, so nobody is left to ask.
	assert.deepEqual(asAuthor.reviewers, []);
	assert.equal(asAuthor.tier, 'none');
});

test('uses the fallback list only when history names nobody', async () => {
	const withFallback = await selectReviewers({
		changedFiles: ['docs/new.mdx'],
		listAuthorsForPath: history({}),
		fallbackReviewers: ['ada'],
	});
	assert.equal(withFallback.tier, 'fallback');
	assert.deepEqual(withFallback.reviewers, ['ada']);

	const withoutFallback = await selectReviewers({
		changedFiles: ['docs/new.mdx'],
		listAuthorsForPath: history({}),
	});
	assert.equal(withoutFallback.tier, 'none');
	assert.deepEqual(withoutFallback.reviewers, []);
});

test('caps the number of reviewers', async () => {
	const result = await selectReviewers({
		changedFiles: ['docs/a.mdx'],
		listAuthorsForPath: history({
			'docs/a.mdx': [human('ada'), human('grace'), human('linus'), human('barbara')],
		}),
		maxReviewers: 2,
	});

	assert.equal(result.reviewers.length, 2);
	assert.equal(result.considered.length, 4, 'ranking keeps everyone; only the pick is capped');
});

test('truncates a sweeping PR by sorted path, so the choice is repeatable', async () => {
	const result = await selectReviewers({
		changedFiles: ['docs/z.mdx', 'docs/a.mdx'],
		listAuthorsForPath: history({
			'docs/a.mdx': [human('ada')],
			'docs/z.mdx': [human('grace')],
		}),
		maxFiles: 1,
	});

	assert.equal(result.truncated, true);
	assert.deepEqual(result.reviewers, ['ada'], 'a.mdx sorts first, whatever order the API returned');
});

test('parentDirectories dedupes and handles a root-level file', () => {
	assert.deepEqual(parentDirectories(['a/b/one.mdx', 'a/b/two.mdx', 'top.mdx']), ['.', 'a/b']);
});
