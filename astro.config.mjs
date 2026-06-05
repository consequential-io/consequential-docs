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
						{ label: 'Connect Meta Ads Manager', slug: 'get-started/connect-meta-ads-manager' },
						{ label: 'Connect Google Ads', slug: 'get-started/connect-google-ads' },
						{ label: 'Connect Google Analytics 4', slug: 'get-started/connect-ga4' },
						{ label: 'Install the Shopify app', slug: 'get-started/install-shopify-app' },
						{ label: 'Add Shopify staff (optional)', slug: 'get-started/add-shopify-staff' },
					],
				},
				{
					label: "How To's",
					items: [
						{ label: 'Onboarding Hub', autogenerate: { directory: 'how-tos/onboarding' } },
						{ label: 'OutOfTheBlue Pulse SDK Setup', autogenerate: { directory: 'how-tos/pulse-sdk' } },
						{
							label: 'EdgeTag Setup & Implementation',
							items: [
								{ slug: 'how-tos/edgetag-setup/cloudflare-hosting' },
								{ label: 'EdgeTag Basics', autogenerate: { directory: 'how-tos/edgetag-setup/edgetag-basics' } },
							],
						},
						{ label: 'How CDP works & How to begin', autogenerate: { directory: 'how-tos/cdp' } },
					],
				},
				{
					label: "FAQ's",
					items: [
						{ label: 'ROAS, Performance & Growth Strategy', autogenerate: { directory: 'faq/roas-growth-strategy' } },
						{ label: 'Integrations & Setup', autogenerate: { directory: 'faq/integrations-setup' } },
						{ label: 'TikTok & Creative Insights', autogenerate: { directory: 'faq/tiktok-creative-insights' } },
						{ label: 'Advertising Best Practices', autogenerate: { directory: 'faq/advertising-best-practices' } },
					],
				},
				{
					label: 'Account & User Management',
					autogenerate: { directory: 'account-management' },
				},
				{
					label: 'Integrations & Platform Setup',
					items: [
						{ label: 'Analytics Integrations', autogenerate: { directory: 'integrations-platform-setup/analytics-integrations' } },
						{ label: 'Ads & Marketing Integrations', autogenerate: { directory: 'integrations-platform-setup/ads-marketing-integrations' } },
						{ label: 'E-Commerce Platform Integrations', autogenerate: { directory: 'integrations-platform-setup/ecommerce-integrations' } },
						{
							label: 'CDP Integrations',
							items: [
								{ slug: 'integrations-platform-setup/cdp-integrations/overview-to-integrate-our-system-into-your-site-or-app' },
								{ slug: 'integrations-platform-setup/cdp-integrations/server-side-cookie' },
								{ slug: 'integrations-platform-setup/cdp-integrations/validation' },
								{ label: 'Browser', autogenerate: { directory: 'integrations-platform-setup/cdp-integrations/browser' } },
								{ label: 'Headless', autogenerate: { directory: 'integrations-platform-setup/cdp-integrations/headless' } },
								{ label: 'HTTP', autogenerate: { directory: 'integrations-platform-setup/cdp-integrations/http' } },
							],
						},
					],
				},
				{
					label: 'Out of the Blue Academy',
					items: [
						{ label: 'Metrics', autogenerate: { directory: 'academy/metrics' } },
						{ label: 'Attribution', autogenerate: { directory: 'academy/attribution' } },
						{ label: 'MCP Guide', autogenerate: { directory: 'academy/mcp-guide' } },
					],
				},
				{
					label: 'Out of the Blue vs Other Tools (Comparisons)',
					autogenerate: { directory: 'comparisons' },
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
