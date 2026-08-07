# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project intent

This repository is the source for **docs.consequential.io**, Consequential's live, public-facing documentation site — not a template. It was originally scaffolded from [EkLine's Starlight docs template](https://github.com/ekline-io/ekline-docs-template-astro) (`ekline-io/ekline-docs-template-astro`), which is still the upstream source for *framework-level* fixes (search behavior, layout, component overrides), but the content itself — ~300 pages across Get Started, Guides, How To's, Academy, Account Management, Integrations, FAQ, Comparisons, and an auto-generated API reference — is Consequential's real product documentation, actively maintained.

Decisions here should optimize for content accuracy and matching the live product, not for staying "template-shaped." Don't add placeholder content, and don't assume an example/generic page is meant to stay generic — if something looks like unfinished template scaffolding, that's more likely leftover content debt (see "Known content caveats" below) than intentional.

Brand theming (`src/styles/global.css` accent/gray tokens: purple `#5636d1` / zinc grays) and the footer credit widget (`src/components/CustomFooter.astro`, EkLine's officially hosted `<ekline-credit>` element) are Consequential-specific customizations layered on top of the template — don't revert these toward the template's generic defaults when syncing upstream fixes.

The project was scaffolded with the official Starlight starter (`npm create astro@latest -- --template starlight`). Astro `^6.2.2`, Starlight `^0.39.2`, Node 22.x verified.

## Authoritative references

**Always consult the Starlight docs before making any change.** This is the rule, not the exception — these docs are the source of truth and override general training knowledge. Any time you're touching config, components, content schema, plugins, theming, routing, i18n, or anything else, fetch the relevant page first and follow the recommended approach there.

- **Starlight docs (start here for every change):** https://starlight.astro.build/
- Astro docs: https://docs.astro.build/en/getting-started/

This applies to bug fixes too: if Starlight has changed how something is configured or named between versions, the docs reflect the current API — your training data may not.

## Working principles

- **Adding a new capability? Look for an existing plugin first.** Before writing any custom integration, component, or remark/rehype plugin, search these two showcases — they are the default answer for "how do I add X to my docs site":
  - **Starlight plugin showcase:** https://starlight.astro.build/resources/plugins/
  - **Astro integrations directory:** https://astro.build/integrations/

  Also check npm and GitHub for community plugins not yet listed in the showcases. Only build custom when nothing suitable exists or existing options have a clear blocker — and document that reason in the PR/commit. This rule applies to every new capability (search, i18n, analytics, OG images, redirects, etc.), not just the ones already wired up.
- **Stay close to Starlight conventions.** Use Starlight's built-in config surface (sidebar config, components override slots, content collections schema) before reaching for Astro-level customization.
- **Verify content claims against the real product before publishing them**, especially anything touching integrations, settings locations, or workflow steps — this repo has a documented history of shipping unverified content (see below). When in doubt, add an explicit `<Aside type="caution">` noting what's unverified rather than publishing a confident-sounding guess.
- **Syncing a fix from the upstream EkLine template?** Diff carefully rather than copying files wholesale — this repo has real, intentional divergences from the template (branding, footer) that a blind overwrite would revert. See the git log around commit `a9d3593` for the process used to sync template fixes safely.

## Known content caveats

A prior content migration pulled in material from a predecessor product's docs and rebranded surface-level references (product names, script hosts, etc.) without verifying the underlying claims against Consequential's actual product. As of this writing, **10 pages still carry an explicit `<Aside type="caution">`** admitting this and asking for verification before being trusted as-is:

- `academy/attribution/attribution-home-page.mdx`, `attribution-models.mdx`, `attribution-window.mdx`, `sales.mdx`
- `account-management/create-admin-user-in-magento.mdx`, `update-the-profile-settings.mdx`
- `integrations-platform-setup/analytics-integrations/connecting-adobe-analytics-with-oauth-server-to-server.mdx`, `how-to-setup-google-analytics-api.mdx`
- `integrations-platform-setup/cdp-integrations/overview-to-integrate-our-system-into-your-site-or-app.mdx`, `validation.mdx`

(Find the current set with `grep -rl "could not be re-verified\|predecessor-product\|Could not verify\|before publishing" src/content/docs/`.) A related, now-resolved instance was the "Pulse SDK" how-to section — it turned out to describe a real product but shipped with the same kind of unverified caution note; it was deleted outright (2026-08-07) rather than published unverified. Treat any page you touch in these directories as unverified until checked against the live app or backend, not as ground truth.

## Commands

- `npm install` — install dependencies
- `npm run dev` — start the dev server (default http://localhost:4321)
- `npm run build` — production build to `./dist/`
- `npm run preview` — preview the production build locally
- `npm run test` — build, then run the markdown-twin contract tests (`tests/*.test.mjs`)
- `npm run astro -- <cmd>` — run Astro CLI commands (e.g. `astro check` for type/content diagnostics)

## Architecture

Standard Starlight layout:

- `astro.config.mjs` — registers the Starlight integration. Title, sidebar, social links, and all plugin config live here. `site` is already set to `https://docs.consequential.io` (not a placeholder) — sitemap and llms-txt emit absolute URLs from it.
- `src/content.config.ts` — content collection definition. Uses `docsLoader()` + `docsSchema()` from `@astrojs/starlight`. Extend the schema (don't replace it) when adding custom frontmatter fields.
- `src/content/docs/` — Markdown/MDX content; each file becomes a route. Subdirs map to URL segments and are referenced by the sidebar config in `astro.config.mjs`.
- `src/schemas/api.yaml` — the real OpenAPI spec for `core`'s API, source for the auto-generated `/api/` reference pages.
- `src/assets/` — images imported from MDX (processed by Astro's image pipeline).
- `public/` — static assets served as-is at the site root.
- `tests/markdown-twins.test.mjs` — contract tests verifying every real doc page emits a working `<page>.md` route (see `@ekline/starlight-contextual-menu` below) and that OpenAPI's virtual pages correctly don't.

Component overrides (Starlight's "Overriding Components" mechanism) go in `src/components/` and are wired through the `components` field of the `starlight()` integration call — don't import Starlight internals directly. Current overrides: `CustomHead`, `CustomHeader`, `CustomHero`, `CustomFooter`, `CustomSearch` (all in `src/components/`).

## Installed plugins

- **`@astrojs/sitemap`** — emits `sitemap-index.xml` + `sitemap-0.xml` on build.
- **`starlight-llms-txt`** — emits `/llms.txt`, `/llms-full.txt`, and `/llms-small.txt` on build for AI assistant consumption. Configured in `astro.config.mjs` with Consequential's real product description. Docs: https://github.com/delucis/starlight-llms-txt
- **`@ekline/starlight-contextual-menu`** — adds the "Copy / View / Open in Claude / Open in ChatGPT" dropdown to each page heading, and (via `injectMarkdownRoutes: true`) generates a `.md` route per page.
- **`starlight-openapi`** — generates the `/api/` reference pages from `src/schemas/api.yaml`.

## Deploy

Production deploys are **manual**, via Cloudflare Workers static assets — there is no CI/CD pipeline wired to this repo, and merging a PR on GitHub does **not** by itself update the live site:

```bash
npm run build
CLOUDFLARE_ACCOUNT_ID=705a25199f79333ff0e4db56e2078036 npx wrangler deploy
```

**GitHub write access gap**: as of this writing, the account used from this machine has `pull`-only access to `consequential-io/consequential-docs` — PRs can be opened but not merged from here. The working pattern has been: make the change, verify with `npm run build`/`npm run test`, deploy directly via `wrangler deploy` above (bypassing GitHub entirely for the live site), then push the branch to a fork for someone with real access to reconcile GitHub's history later. Don't assume "committed" means "live," or that "live" means "merged on GitHub" — check both independently.
