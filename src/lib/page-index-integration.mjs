// @ts-check
/**
 * Astro integration: generates dist/page-index.json after every build.
 *
 * Also runnable standalone:
 *   node src/lib/page-index-integration.mjs
 *   node src/lib/page-index-integration.mjs --out /tmp/index.json
 *
 * Each entry:
 *   { mdUrl: string, title: string, keywords: string[] }
 *
 * mdUrl is the path of the Markdown twin served from the same origin as the
 * docs site, e.g. /academy/attribution/attribution-models.md. The MCP
 * search_docs tool fetches that path to get the full page content.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { removeStopwords, eng } from 'stopword'

const DOCS_DIR = 'src/content/docs'

// Extra domain-noise words the library's English list doesn't cover:
// common action verbs and filler words that appear on every docs page.
const EXTRA_STOPWORDS = new Set([
  'use', 'used', 'using', 'get', 'set', 'see', 'add', 'make', 'take', 'need',
  'page', 'click', 'select', 'open', 'go', 'just', 'like', 'here', 'there',
  'want', 'let', 'lets', 'via', 'per', 'etc', 'e', 'g', 'vs', 'ii', 'iii',
])

/** Recursively yield file paths whose name satisfies the predicate. */
function* walk(dir, predicate) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(fullPath, predicate)
    else if (predicate(entry.name)) yield fullPath
  }
}

/** Pull a scalar frontmatter value by key (title, description, etc.). */
function frontmatterValue(source, key) {
  const match = source.match(new RegExp(`^${key}:\\s*['"]?(.+?)['"]?\\s*$`, 'm'))
  return match ? match[1].trim() : null
}

/** True when the page should be excluded from the search index. */
function shouldSkip(source) {
  // 404 / splash pages / explicitly excluded from pagefind
  if (/^pagefind:\s*false/m.test(source)) return true
  if (/^template:\s*splash/m.test(source)) return true
  return false
}

/**
 * Extract keywords from an MDX file.
 *
 * Sources in priority order:
 * 1. Title words
 * 2. Description words
 * 3. Body text (headings weighted by stripping the # prefix first)
 *
 * Words are lowercased, deduplicated, ≥3 chars, non-stopword.
 * Preserves acronyms like POAS, ROAS, UTM, AOV, SKU.
 */
function extractKeywords(source) {
  const fmEnd = source.indexOf('\n---\n', 4)
  const frontmatter = fmEnd > 0 ? source.slice(0, fmEnd) : ''
  const body = fmEnd > 0 ? source.slice(fmEnd + 5) : source

  const title = frontmatterValue(frontmatter, 'title') ?? ''
  const description = frontmatterValue(frontmatter, 'description') ?? ''

  // Strip MDX/JSX: imports, component tags, code fences, inline code
  const cleanBody = body
    .replace(/^import\s.+$/gm, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/<[^>]+>/g, ' ')

  const allText = `${title} ${title} ${description} ${description} ${cleanBody}`

  const rawWords = allText.split(/[^a-zA-Z0-9_]+/).filter((w) => w.length >= 3)
  const filtered = removeStopwords(rawWords, eng).filter((w) => !EXTRA_STOPWORDS.has(w.toLowerCase()))

  const seen = new Set()
  const keywords = []
  for (const word of filtered) {
    const lower = word.toLowerCase()
    if (!seen.has(lower)) {
      seen.add(lower)
      keywords.push(lower)
    }
  }
  return keywords
}

/**
 * Derive the Markdown twin URL from the MDX file path.
 *
 * src/content/docs/academy/attribution/attribution-models.mdx
 *   → /academy/attribution/attribution-models.md
 */
function mdUrl(filePath, docsDir) {
  const rel = relative(docsDir, filePath).split(sep).join('/')
  return '/' + rel.replace(/\.mdx?$/, '.md')
}

/** Build the full index from the docs directory. */
function buildIndex(rootDir) {
  const docsDir = join(rootDir, DOCS_DIR)
  const entries = []

  for (const filePath of walk(docsDir, (name) => /\.mdx?$/.test(name))) {
    const source = readFileSync(filePath, 'utf8')
    if (shouldSkip(source)) continue

    const title = frontmatterValue(source, 'title')
    if (!title) continue

    entries.push({
      mdUrl: mdUrl(filePath, docsDir),
      title,
      keywords: extractKeywords(source),
    })
  }

  return entries
}

// ─── Astro integration (used in astro.config.mjs) ────────────────────────────

/** @returns {import('astro').AstroIntegration} */
export function pageIndexIntegration() {
  return {
    name: 'page-index',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const rootDir = fileURLToPath(new URL('../..', import.meta.url))
        const entries = buildIndex(rootDir)
        const outFile = join(fileURLToPath(dir), 'page-index.json')
        writeFileSync(outFile, JSON.stringify(entries))
        logger.info(`page-index: wrote ${entries.length} entries → ${outFile}`)
      },
    },
  }
}

// ─── Standalone runner ────────────────────────────────────────────────────────

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  const rootDir = fileURLToPath(new URL('../..', import.meta.url))
  const entries = buildIndex(rootDir)

  const outArg = process.argv.indexOf('--out')
  const outPath = outArg >= 0 ? process.argv[outArg + 1] : join(rootDir, 'dist/page-index.json')

  mkdirSync(join(rootDir, 'dist'), { recursive: true })
  writeFileSync(outPath, JSON.stringify(entries, null, 2))

  console.log(`Wrote ${entries.length} entries → ${outPath}`)
  console.log('\nSample (first 5):')
  for (const e of entries.slice(0, 5)) {
    console.log(`  ${e.mdUrl}`)
    console.log(`    title:    ${e.title}`)
    console.log(`    keywords: ${e.keywords.slice(0, 15).join(', ')}`)
  }
}
