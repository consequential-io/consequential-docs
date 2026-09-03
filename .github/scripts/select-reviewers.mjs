/**
 * Pick the humans who should review a bot-raised docs PR.
 *
 * The problem this solves: EkLine's Docs Agent opens PRs against pages nobody
 * is notified about, so they sit. The person best placed to judge a drift or
 * SEO edit is whoever wrote the page in the first place — that information is
 * already in the repository's history, it just was not being used.
 *
 * Three tiers, each consulted only when the one above it comes back empty:
 *
 *   1. FILE      — humans who have committed to the exact files this PR edits.
 *   2. DIRECTORY — humans who have committed anywhere in those files' folders.
 *                  Needed more often than you would guess: a page the agent
 *                  both created and later edited has a bot-only file history,
 *                  while its section still has real owners.
 *   3. FALLBACK  — a configured list, for a PR touching genuinely new ground.
 *
 * No I/O of its own. `listAuthorsForPath` is injected so the same code runs
 * under Actions (octokit), under `node --test` (a stub), and in a local
 * dry-run against real PRs (`gh api`).
 */

/** GitHub App identities end in `[bot]`; `type` alone misses some of them. */
const BOT_LOGIN = /\[bot\]$/i;

const lower = (value) => String(value ?? '').toLowerCase();

/**
 * Resolve a login through the alias map — one person, two accounts.
 *
 * Applied BEFORE any exclusion, so a personal account that aliases to the PR
 * author is dropped as the PR author rather than tagged as a stranger, and
 * two accounts belonging to one person score as one reviewer.
 */
function applyAlias(login, aliases) {
	const hit = Object.entries(aliases).find(([from]) => lower(from) === lower(login));
	return hit ? hit[1] : login;
}

function isHuman(author) {
	if (!author?.login) return false; // an unlinked commit email resolves to null
	if (author.type && author.type !== 'User') return false;
	return !BOT_LOGIN.test(author.login);
}

/**
 * Score candidates over a set of paths.
 *
 * Breadth first (how many of this PR's paths a person has touched), then depth
 * (total commits), then recency, then login — the last one only so a tie can
 * never reorder between runs and make the choice look arbitrary.
 */
async function scorePaths(paths, listAuthorsForPath, { aliases, excluded }) {
	const scores = new Map();

	for (const path of paths) {
		const authors = (await listAuthorsForPath(path)) ?? [];
		const seenHere = new Set();

		for (const author of authors) {
			if (!isHuman(author)) continue;

			const login = applyAlias(author.login, aliases);
			if (excluded.has(lower(login))) continue;

			const score = scores.get(lower(login)) ?? {
				login,
				paths: 0,
				commits: 0,
				latest: '',
			};
			if (!seenHere.has(lower(login))) {
				score.paths += 1;
				seenHere.add(lower(login));
			}
			score.commits += 1;
			if (author.date && author.date > score.latest) score.latest = author.date;
			scores.set(lower(login), score);
		}
	}

	return [...scores.values()].sort(
		(a, b) =>
			b.paths - a.paths ||
			b.commits - a.commits ||
			b.latest.localeCompare(a.latest) ||
			a.login.localeCompare(b.login)
	);
}

/** Unique parent folders of the given paths, in a stable order. */
export function parentDirectories(paths) {
	const directories = new Set();
	for (const path of paths) {
		const slash = path.lastIndexOf('/');
		directories.add(slash === -1 ? '.' : path.slice(0, slash));
	}
	return [...directories].sort();
}

/**
 * @param {object} options
 * @param {string[]} options.changedFiles Paths the PR touches.
 * @param {(path: string) => Promise<Array<{login?: string, type?: string, date?: string}>>} options.listAuthorsForPath
 *   Commit authors for a path on the BASE branch, newest first.
 * @param {string} [options.prAuthor] Never reviews its own PR.
 * @param {string[]} [options.alreadyRequested] Reviewers already on the PR.
 * @param {Record<string,string>} [options.aliases] `fromLogin` -> `toLogin`.
 * @param {string[]} [options.fallbackReviewers] Used only when history yields nobody.
 * @param {number} [options.maxReviewers] Cap — three pairs of eyes is a review, ten is a mailing list.
 * @param {number} [options.maxFiles] Bounds the API calls on a sweeping PR.
 * @returns {Promise<{reviewers: string[], tier: 'file'|'directory'|'fallback'|'none', considered: object[], truncated: boolean}>}
 */
export async function selectReviewers({
	changedFiles,
	listAuthorsForPath,
	prAuthor = '',
	alreadyRequested = [],
	aliases = {},
	fallbackReviewers = [],
	maxReviewers = 3,
	maxFiles = 50,
}) {
	// Sorted before slicing: on a PR too wide to walk in full, WHICH files get
	// examined must not depend on the order the API happened to return them.
	const files = [...changedFiles].sort();
	const considered = files.slice(0, maxFiles);
	const truncated = files.length > considered.length;

	const excluded = new Set(
		[prAuthor, ...alreadyRequested]
			.filter(Boolean)
			.map((login) => lower(applyAlias(login, aliases)))
	);

	for (const [tier, paths] of [
		['file', considered],
		['directory', parentDirectories(considered)],
	]) {
		const ranked = await scorePaths(paths, listAuthorsForPath, { aliases, excluded });
		if (ranked.length > 0) {
			return {
				reviewers: ranked.slice(0, maxReviewers).map((score) => score.login),
				tier,
				considered: ranked,
				truncated,
			};
		}
	}

	const fallback = fallbackReviewers.filter((login) => !excluded.has(lower(login)));
	return {
		reviewers: fallback.slice(0, maxReviewers),
		tier: fallback.length > 0 ? 'fallback' : 'none',
		considered: [],
		truncated,
	};
}
