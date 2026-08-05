// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import starlightContextualMenu from '@ekline/starlight-contextual-menu';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://consequential.io',
	integrations: [
		sitemap(),
		starlight({
			title: 'Consequential Docs',
			social: [],
			customCss: ['./src/styles/global.css'],
			components: {
				Head: './src/components/CustomHead.astro',
				Header: './src/components/CustomHeader.astro',
				Hero: './src/components/CustomHero.astro',
				Footer: './src/components/CustomFooter.astro',
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
						'Documentation for Consequential — a data-driven growth platform for eCommerce and DTC brands. Products include Northstar, Pulse, and Pixel for analytics, site monitoring, and UX insights.',
				}),
				// Generates reference pages under `/api/` from the OpenAPI spec.
				// Replace `src/schemas/api.yaml` with your own spec (YAML or JSON).
				starlightOpenAPI([
					{
						base: 'api',
						label: 'API reference',
						schema: './src/schemas/api.yaml',
					},
				]),
			],
			sidebar: [
				{
					label: 'Get started with Out of the Blue',
					items: [
						{ label: 'Overview', slug: 'get-started/overview' },
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
					label: 'Daily reports',
					items: [{ autogenerate: { directory: 'daily-reports' } }],
				},
				{
					label: "How To's",
					items: [
						{ label: 'Onboarding Hub', items: [{ autogenerate: { directory: 'how-tos/onboarding' } }] },
						{ label: 'OutOfTheBlue Pulse SDK Setup', items: [{ autogenerate: { directory: 'how-tos/pulse-sdk' } }] },
						{
							label: 'EdgeTag Setup & Implementation',
							items: [
								{ slug: 'how-tos/edgetag-setup/cloudflare-hosting' },
								{ label: 'EdgeTag Basics', items: [{ autogenerate: { directory: 'how-tos/edgetag-setup/edgetag-basics' } }] },
							],
						},
						{ label: 'How CDP works & How to begin', items: [{ autogenerate: { directory: 'how-tos/cdp' } }] },
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
					label: 'Integrations & Platform Setup',
					items: [
						{ label: 'Analytics Integrations', items: [{ autogenerate: { directory: 'integrations-platform-setup/analytics-integrations' } }] },
						{ label: 'Ads & Marketing Integrations', items: [{ autogenerate: { directory: 'integrations-platform-setup/ads-marketing-integrations' } }] },
						{ label: 'E-Commerce Platform Integrations', items: [{ autogenerate: { directory: 'integrations-platform-setup/ecommerce-integrations' } }] },
						{
							label: 'CDP Integrations',
							items: [
								{ slug: 'integrations-platform-setup/cdp-integrations/overview-to-integrate-our-system-into-your-site-or-app' },
								{ slug: 'integrations-platform-setup/cdp-integrations/server-side-cookie' },
								{ slug: 'integrations-platform-setup/cdp-integrations/validation' },
								{ label: 'Browser', items: [{ autogenerate: { directory: 'integrations-platform-setup/cdp-integrations/browser' } }] },
								{ label: 'Headless', items: [{ autogenerate: { directory: 'integrations-platform-setup/cdp-integrations/headless' } }] },
								{ label: 'HTTP', items: [{ autogenerate: { directory: 'integrations-platform-setup/cdp-integrations/http' } }] },
							],
						},
					],
				},
				{
					label: 'Out of the Blue Academy',
					items: [
						{ label: 'Metrics', items: [{ autogenerate: { directory: 'academy/metrics' } }] },
						{ label: 'Attribution', items: [{ autogenerate: { directory: 'academy/attribution' } }] },
						{ label: 'MCP Guide', items: [{ autogenerate: { directory: 'academy/mcp-guide' } }] },
					],
				},
				{
					label: 'Out of the Blue vs Other Tools (Comparisons)',
					items: [{ autogenerate: { directory: 'comparisons' } }],
				},
				// API reference pages auto-generated from `src/schemas/api.yaml`.
				...openAPISidebarGroups,
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
