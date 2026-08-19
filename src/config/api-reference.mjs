/**
 * API references — the one file to edit.
 *
 * Each entry below becomes a route rendering one OpenAPI document with Scalar.
 * The routes, the sidebar, and the search index are all derived from this list,
 * so there is no second place to keep in sync.
 *
 * Consequential ships one reference, at `docs` layout so it stays embedded in
 * Starlight's own sidebar (nested under "Developers" in `astro.config.mjs`)
 * rather than taking over the page — that matches the UX `starlight-openapi`
 * gave this site before this migration.
 */

/** @typedef {'docs' | 'full'} ApiLayout */

export const apiReferences = [
	{
		id: 'consequential-api',
		enabled: true,

		/**
		 * Path segment under `/api/`, or `''` for `/api/` itself.
		 *
		 * Empty so the route stays at `/api/`, matching every existing internal
		 * link (`src/content/docs/index.mdx`, `reference/overview.mdx`,
		 * `guides/send-your-first-request.mdx`) and the URL readers already have
		 * bookmarked.
		 */
		slug: '',

		/** @type {ApiLayout} */
		layout: 'docs',

		/** The document on disk, read at build time to generate the sidebar. */
		spec: './public/api.yaml',
		/**
		 * The same document as the browser fetches it. Scalar loads it
		 * client-side, so this must resolve on the deployed site.
		 */
		specUrl: '/api.yaml',

		/** Sidebar group label, page `<title>`, and H1. */
		label: 'API reference',
		title: 'API reference',
		description:
			"Interactive reference for Consequential's REST API — analytics, acquisition, tenant/store management, billing, and integrations.",
	},
];

/** References that are actually built, in declaration order. */
export const enabledReferences = apiReferences.filter((reference) => reference.enabled);

/**
 * The URL a reference is served at — the single source for the page, its
 * sidebar entries and its search anchors, so those three cannot disagree.
 */
export function routeFor(reference) {
	const slug = (reference.slug ?? '').replace(/^\/+|\/+$/g, '');
	return slug ? `/api/${slug}/` : '/api/';
}

// Two references on one route is a config mistake with a confusing symptom:
// both build to the same path, the sidebar grows two entries pointing at one
// page, and whichever document loses is silently unreachable. Say so at build
// time rather than leaving it to be noticed in review.
{
	const seen = new Set();
	for (const reference of enabledReferences) {
		const route = routeFor(reference);
		if (seen.has(route)) {
			throw new Error(
				`[api-reference] Two references are configured at "${route}" ` +
					`("${reference.id}" is the second). Give each one a distinct \`slug\`.`
			);
		}
		seen.add(route);
	}
}

/**
 * Show each operation as its own sidebar link.
 *
 * Only for the `docs` layout: it is the one that keeps Starlight's sidebar on
 * screen, so without this there would be a single entry for the whole reference
 * and finding an endpoint would mean scrolling. Under `full`, Scalar's own
 * sidebar already lists every operation and a second copy in Starlight's would
 * be two navigation trees for one document.
 */
export function listsOperationsInSidebar(reference) {
	return reference.layout === 'docs';
}
