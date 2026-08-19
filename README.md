# Consequential Docs

Source for [docs.consequential.io](https://docs.consequential.io) — Consequential's public documentation site: product guides, integration how-tos, an Academy of attribution/metrics explainers, FAQs, comparisons, and an auto-generated API reference.

Built on [Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/), scaffolded from [EkLine's docs template](https://github.com/ekline-io/ekline-docs-template-astro) and since customized with Consequential's own branding and ~300 pages of real content.

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

## What's in this site

- `get-started/` — connecting ad/analytics platforms, installing the Shopify app
- `concepts/` — the mental model behind the product
- `guides/`, `daily-reports/`, `acquisition-dashboard/` — task-oriented product walkthroughs
- `how-tos/` — Onboarding Hub and EdgeTag (CDP) setup/implementation
- `academy/` — attribution and metrics explainers
- `account-management/`, `integrations-platform-setup/` — settings and platform-integration reference
- `faq/`, `comparisons/` — support and competitive content
- `api/` — interactive reference, rendered by [Scalar](https://scalar.com/) from `public/api.yaml` (core's real OpenAPI spec) — includes a live "Test Request" console, not just static docs
- `changelog.mdx`, `reference/`

> **Known gap:** a handful of pages (migrated from a predecessor product's docs) still carry an explicit `<Aside type="caution">` flagging content that couldn't be verified against the current product — see the "Known content caveats" note in `CLAUDE.md` before trusting anything under `academy/attribution/`, `account-management/`, or `integrations-platform-setup/analytics-integrations/` and `cdp-integrations/` at face value.

## What's pre-wired

Inherited from the EkLine template, still in use:

- **Tailwind v4** styling with Consequential's brand theme (purple `#5636d1` / zinc grays) in `src/styles/global.css` — see [`wiki/theming.md`](./wiki/theming.md) for the mechanics of changing it.
- **Sitemap** auto-generated on build (`sitemap-index.xml` + `sitemap-0.xml`).
- **`llms.txt`** for AI assistants — `/llms.txt`, `/llms-full.txt`, and `/llms-small.txt`.
- **Full-text search** via Pagefind, with a custom fix (`src/components/CustomSearch.astro`) for search staying bound across Astro view-transition navigation.
- **Dark / light mode** with system preference detection.
- **Footer credit** — EkLine's officially hosted widget (`src/components/CustomFooter.astro`).
- A **Markdown-twin contract test** (`tests/markdown-twins.test.mjs`) verifying every real doc page has a working `<page>.md` route for AI-assistant consumption.

## Local development

```bash
git clone <this-repo-url>
cd consequential-docs
npm install
npm run dev
```

Site is live at <http://localhost:4321/> with hot reload.

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Local dev server at `localhost:4321` |
| `npm run build` | Production build to `./dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run test` | Build, then run the markdown-twin contract tests |
| `npm run astro ...` | Run Astro CLI commands (e.g. `astro check`) |

## Deploy

Production deploys are **manual**, via Cloudflare Workers static assets — there is currently no CI/CD pipeline wired to this repo:

```bash
npm run build
CLOUDFLARE_ACCOUNT_ID=705a25199f79333ff0e4db56e2078036 npx wrangler deploy
```

This pushes `dist/` straight to the `consequential-docs` Worker on Cloudflare, independent of GitHub — merging a PR alone does **not** update the live site. (A `vercel.json` also exists in this repo but isn't the actual deploy path; its Vercel preview checks on PRs are known to fail for unrelated account reasons.)

## Editing content

| What you want to change | Where to do it |
| --- | --- |
| Site title, sidebar, social links | `astro.config.mjs` |
| Theme colors, fonts | `src/styles/global.css` — see [`wiki/theming.md`](./wiki/theming.md) |
| Homepage content | `src/content/docs/index.mdx` |
| Add a new page | Create a `.mdx` file under `src/content/docs/`, then add it to the sidebar in `astro.config.mjs` |
| API reference | `public/api.yaml` (the spec) + `src/config/api-reference.mjs` (route/slug/layout) |
| Footer credit | `src/components/CustomFooter.astro` |

For anything Starlight-level (sidebar groups, component overrides, content schema, i18n), the [Starlight docs](https://starlight.astro.build/) are the source of truth.

## Learn more

- [Starlight docs](https://starlight.astro.build/) — sidebar, components, content schema, theming.
- [Astro docs](https://docs.astro.build/) — routing, integrations, deployment.
- [EkLine docs template](https://github.com/ekline-io/ekline-docs-template-astro) — the upstream template this site tracks for framework-level fixes (not content).

## License

[MIT](./LICENSE).

---

Scaffolded from a template maintained by [EkLine](https://ekline.io).
