#!/usr/bin/env node
/* global console, process */

/**
 * Decode HTML entities accidentally baked into locale translation data.
 *
 * An upstream translation step HTML-escaped apostrophes/quotes, so locale .ts
 * sources contain literal entity text like `'Error d&#39;inici de sessió'` —
 * which renders as `d&#39;inici` in the UI instead of `d'inici`, and breaks the
 * apostrophe round-trip tests. This decodes the entities back to real chars.
 *
 * Locale values use single quotes (prettier style): apostrophes are emitted
 * escaped (\') and double-quotes plain (") so the output is valid and lint-clean
 * inside '...'. Run prettier afterward to normalise the quote style.
 *
 * Modes:
 *   --check   exit 1 if any entity remains (CI guard against recurrence)
 *   --fix     rewrite files
 *   (default) dry-run: counts + samples, writes nothing
 *
 * Usage:
 *   node scripts/decode-locale-entities.js            # dry-run
 *   node scripts/decode-locale-entities.js --fix
 *   node scripts/decode-locale-entities.js --check    # CI
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MODE = process.argv.includes('--fix')
  ? 'fix'
  : process.argv.includes('--check')
    ? 'check'
    : 'dry'

// Order matters: decode &amp; LAST so we never synthesise a new entity.
// Locale values are single-quoted (prettier style), so: apostrophes are emitted
// escaped (\') — necessary and lint-clean inside '...'; double-quotes are emitted
// PLAIN (") — valid and lint-clean inside '...' (an escaped \" would trip
// no-useless-escape, which eslint can't auto-fix in these multi-quote strings).
// Prettier then re-picks the quote style. (Not valid for double-quoted sources,
// but this codebase has none.)
const ENTITIES = [
  [/&#39;/g, "\\'"],
  [/&#x27;/gi, "\\'"],
  [/&apos;/g, "\\'"],
  [/&quot;/g, '"'],
  [/&#34;/g, '"'],
  [/&#x22;/gi, '"'],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&nbsp;/g, '\\u00A0'],
  [/&amp;/g, '&'],
]
// A single matcher to detect "any entity remains" for --check / counting.
const ANY_ENTITY = /&(#\d+|#x[0-9a-f]+|[a-z]+);/gi

// Collect locale source .ts files (any `locales/` dir under packages, excl tests/dist)
const files = []
/**
 * Recursively collect locale source .ts file paths into `files`.
 * @param dir directory to walk
 * @param depth current recursion depth (bounded)
 */
function walk(dir, depth = 0) {
  if (depth > 9) return
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (
      e.name === 'node_modules' ||
      e.name === 'dist' ||
      e.name === '.git' ||
      e.name === '__tests__'
    )
      continue
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, depth + 1)
    else if (e.name.endsWith('.ts') && /[/\\]locales[/\\]/.test(p)) files.push(p)
  }
}
walk(join(ROOT, 'packages'))

let totalDecoded = 0
let changedFiles = 0
const remaining = [] // for --check
const samples = []

for (const f of files) {
  const src = readFileSync(f, 'utf-8')
  let out = src
  let n = 0
  for (const [re, rep] of ENTITIES) {
    out = out.replace(re, () => {
      n++
      return rep
    })
  }
  if (n > 0) {
    totalDecoded += n
    changedFiles++
    if (samples.length < 5) {
      const before = src.match(/^.*&(#\d+|[a-z]+);.*$/im)?.[0]?.trim()
      if (before) samples.push(`${f.replace(ROOT + '/', '')}\n    - ${before}`)
    }
    if (MODE === 'fix') writeFileSync(f, out)
  }
  // After (hypothetical) decode, are there entities our table didn't cover?
  const leftover = out.match(ANY_ENTITY)
  if (leftover) remaining.push(`${f.replace(ROOT + '/', '')}: ${[...new Set(leftover)].join(' ')}`)
}

if (MODE === 'check') {
  // In check mode we don't decode — flag any entity present in source as-is.
  const present = []
  for (const f of files) {
    const m = readFileSync(f, 'utf-8').match(ANY_ENTITY)
    if (m) present.push(`${f.replace(ROOT + '/', '')}: ${[...new Set(m)].slice(0, 6).join(' ')}`)
  }
  if (present.length) {
    console.error(`✗ ${present.length} locale file(s) contain HTML entities (run with --fix):`)
    for (const p of present.slice(0, 20)) console.error('   ' + p)
    if (present.length > 20) console.error(`   …and ${present.length - 20} more`)
    process.exit(1)
  }
  console.log(`✓ No HTML entities in ${files.length} locale source files.`)
  process.exit(0)
}

console.log(`Scanned ${files.length} locale source files.`)
console.log(
  `${MODE === 'fix' ? 'Decoded' : 'Would decode'} ${totalDecoded} entit${totalDecoded === 1 ? 'y' : 'ies'} across ${changedFiles} file(s).`,
)
if (samples.length) {
  console.log('\nSamples (before):')
  for (const s of samples) console.log('  ' + s)
}
if (MODE === 'dry') console.log('\n(dry run — no files written; use --fix, then `npm run format`)')
else if (remaining.length) {
  console.log(`\n⚠ ${remaining.length} file(s) still contain entities our table doesn't cover:`)
  for (const r of remaining.slice(0, 10)) console.log('   ' + r)
}
