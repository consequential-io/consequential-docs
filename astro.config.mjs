// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import starlightContextualMenu from '@ekline/starlight-contextual-menu';
import starlightLlmsTxt from 'starlight-llms-txt';
import tailwindcss from '@tailwindcss/vite';
import { openApiSidebarGroup } from './src/lib/openapi-sidebar.mjs';
import { enabledReferences, listsOperationsInSidebar, routeFor } from './src/config/api-reference.mjs';

// One sidebar entry per API reference, generated from its OpenAPI document.
// Regenerated on every build. Which references exist, what they are called and
// which layout each uses lives in `src/config/api-reference.mjs`. See
// `wiki/api-reference.md` in the upstream template for the full explanation.
const apiReferenceSidebar = await Promise.all(
	enabledReferences.map((reference) =>
		listsOperationsInSidebar(reference)
			? openApiSidebarGroup({
					spec: reference.spec,
					base: routeFor(reference),
					label: reference.label,
				})
			: { label: reference.label, link: routeFor(reference) }
	)
);

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.consequential.io',
	redirects: {
		// Old page was a stale duplicate of `daily-reports/view-and-interpret-your-daily-report`
		// (had gone out of date on the Regenerate behavior); consolidated into that page.
		'/guides/daily-reports/': '/daily-reports/view-and-interpret-your-daily-report/',
	},
	integrations: [
		sitemap(),
		starlight({
			title: 'Consequential Docs',
			social: [],
			customCss: ['./src/styles/global.css'],
			head: [
				{
					tag: 'script',
					attrs: {
						src: 'https://ekline.io/v1/credit.js',
						async: true,
					},
				},
			],
			components: {
				Head: './src/components/CustomHead.astro',
				Header: './src/components/CustomHeader.astro',
				Hero: './src/components/CustomHero.astro',
				Footer: './src/components/CustomFooter.astro',
				// Re-init Pagefind after every Astro view-transition swap — the
				// upstream component only initializes on `DOMContentLoaded`,
				// which doesn't fire on subsequent <ClientRouter /> navigations.
				Search: './src/components/CustomSearch.astro',
			},
			plugins: [
				// Adds a "Copy / View / Open in Claude / Open in ChatGPT" dropdown to
				// each page heading. `injectMarkdownRoutes: true` generates a `.md`
				// route per page so the View / Claude / ChatGPT actions can deep-link
				// to raw markdown.
				starlightContextualMenu({
					actions: ['copy', 'view', 'claude', 'chatgpt'],
					injectMarkdownRoutes: true,
				}),
				starlightLlmsTxt({
					projectName: 'Consequential',
					description:
						'Documentation for Consequential — a data-driven growth platform for eCommerce and DTC brands. Products include Northstar and Pixel for analytics and site monitoring.',
				}),
			],
			sidebar: [
				{
					label: 'Get started',
					items: [
						{ label: 'Overview', slug: 'get-started/overview' },
						{ label: 'Create your account and connect your store', slug: 'get-started/create-your-account' },
						{ label: 'Connect your store', slug: 'get-started/connect-your-store' },
						{ label: 'Connect your data', slug: 'get-started/connect-your-data' },
						{ label: 'Connect Meta Ads Manager', slug: 'get-started/connect-meta-ads-manager' },
						{ label: 'Connect Google Ads', slug: 'get-started/connect-google-ads' },
						{ label: 'Connect Google Analytics 4', slug: 'get-started/connect-ga4' },
						{ label: 'Install the Shopify app', slug: 'get-started/install-shopify-app' },
						{ label: 'Add Shopify staff (optional)', slug: 'get-started/add-shopify-staff' },
					],
				},
				{
					label: 'Concepts',
					items: [{ autogenerate: { directory: 'concepts' } }],
				},
				{
					// Product-feature usage guides. Kept as its own group, separate from
					// "How To's" (technical setup/implementation) and "Developers" (API/SDK).
					label: 'Guides',
					items: [
						{ label: 'Daily Reports', items: [{ autogenerate: { directory: 'daily-reports' } }] },
						{ label: 'Acquisition Dashboard', items: [{ autogenerate: { directory: 'acquisition-dashboard' } }] },
					],
				},
				{
					label: "How To's",
					items: [
						{ label: 'Onboarding Hub', items: [{ autogenerate: { directory: 'how-tos/onboarding' } }] },
						{
							label: 'EdgeTag Setup & Implementation',
							items: [
								{ slug: 'how-tos/edgetag-setup/cloudflare-hosting' },
								{ label: 'EdgeTag Basics', items: [{ autogenerate: { directory: 'how-tos/edgetag-setup/edgetag-basics' } }] },
							],
						},
						// Setting up Consequential's own Pixel/CDP for your store (business/marketer task) —
						// not to be confused with "CDP SDK Reference" under Developers, which is the
						// engineering-facing event/protocol spec for integrating against it.
						{ label: 'Consequential Pixel (CDP) Setup', items: [{ autogenerate: { directory: 'how-tos/cdp' } }] },
					],
				},
				{
					// Business-user integrations: connecting external platforms Consequential reads from.
					// Developer-facing SDK/protocol docs live under "Developers" instead.
					label: 'Integrations & Platform Setup',
					items: [
						{ label: 'Analytics Integrations', items: [{ autogenerate: { directory: 'integrations-platform-setup/analytics-integrations' } }] },
						{ label: 'Ads & Marketing Integrations', items: [{ autogenerate: { directory: 'integrations-platform-setup/ads-marketing-integrations' } }] },
						{ label: 'E-Commerce Platform Integrations', items: [{ autogenerate: { directory: 'integrations-platform-setup/ecommerce-integrations' } }] },
						{ label: 'Partner Integrations', items: [{ autogenerate: { directory: 'integrations-platform-setup/partner-integrations' } }] },
					],
				},
				{
					label: 'Consequential Academy',
					items: [
						{ label: 'Metrics', items: [{ autogenerate: { directory: 'academy/metrics' } }] },
						{ label: 'Attribution', items: [{ autogenerate: { directory: 'academy/attribution' } }] },
						{ label: 'MCP Guide', items: [{ autogenerate: { directory: 'academy/mcp-guide' } }] },
					],
				},
				{
					label: "FAQ's",
					items: [
						{ label: 'ROAS, Performance & Growth Strategy', items: [{ autogenerate: { directory: 'faq/roas-growth-strategy' } }] },
						{ label: 'Integrations & Setup', items: [{ autogenerate: { directory: 'faq/integrations-setup' } }] },
						{ label: 'TikTok & Creative Insights', items: [{ autogenerate: { directory: 'faq/tiktok-creative-insights' } }] },
						{ label: 'Advertising Best Practices', items: [{ autogenerate: { directory: 'faq/advertising-best-practices' } }] },
					],
				},
				{
					label: 'Account & User Management',
					items: [{ autogenerate: { directory: 'account-management' } }],
				},
				{
					label: 'Consequential vs Other Tools (Comparisons)',
					items: [{ autogenerate: { directory: 'comparisons' } }],
				},
				{
					// Everything an engineer needs to build against Consequential, in one place:
					// API quickstart, the CDP's engineering-facing SDK/protocol reference (moved here
					// from "Integrations & Platform Setup", which is now business-integrations-only),
					// error/response-shape reference, and the generated OpenAPI reference.
					label: 'Developers',
					items: [
						{ slug: 'guides/send-your-first-request' },
						{
							label: 'CDP SDK Reference',
							items: [
								{ slug: 'integrations-platform-setup/cdp-integrations/overview-to-integrate-our-system-into-your-site-or-app' },
								{ slug: 'integrations-platform-setup/cdp-integrations/server-side-cookie' },
								{ slug: 'integrations-platform-setup/cdp-integrations/validation' },
								{ label: 'Browser', items: [{ autogenerate: { directory: 'integrations-platform-setup/cdp-integrations/browser' } }] },
								{ label: 'Headless', items: [{ autogenerate: { directory: 'integrations-platform-setup/cdp-integrations/headless' } }] },
								{ label: 'HTTP', items: [{ autogenerate: { directory: 'integrations-platform-setup/cdp-integrations/http' } }] },
							],
						},
						{ label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
						// API reference, rendered by Scalar from `public/api.yaml`.
						...apiReferenceSidebar,
					],
				},
				{
					label: 'Changelog',
					slug: 'changelog',
				},
			],
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
