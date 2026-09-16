#!/usr/bin/env node
/* global console, process, URL */

/**
 * Verify every locale bond's interpolation placeholders against its own `en.ts`.
 *
 * ## Why this exists
 *
 * `{{title}}` in a translation is a VARIABLE REFERENCE, not prose. At runtime a
 * component calls `t('key', { title: track.title })` and the i18n provider
 * substitutes the value whose key matches the placeholder NAME. So the name
 * inside the braces must be byte-identical in all 79 languages, and there must
 * be exactly as many of them as `en.ts` has.
 *
 * An upstream machine-translation step translated the names along with the
 * sentences — `{{title}}` became `{{titel}}` (af), `{{título}}` (es),
 * `{{ርዕስ}}` (am) — and leaked its own placeholder-protection markup (`<x>…</x>`)
 * into the output. `core/i18n/src/utilities.ts` returns an unmatched placeholder
 * LITERALLY, so the UI showed `Nou speel: {{titel}}` where a track name belonged.
 * Most of these strings are `aria-*` labels, so the damage landed precisely on
 * screen-reader users. 1,722 files across 38 packages were affected.
 *
 * The same pipeline previously baked HTML entities into these files (see
 * `decode-locale-entities.js`) — this is the third symptom of one bad step, which
 * is why the check is permanent rather than a one-off fix.
 *
 * ## What the existing tests could not see
 *
 * Every locale bond asserts key PRESENCE and non-emptiness (`typeof v ===
 * 'string'`, `length > 0`). A value of complete nonsense passes both.
 * `check-i18n-parity.js` checks a different axis again: whether `en.ts` covers
 * the keys the code actually calls. Nothing compared placeholder names between a
 * translation and its English source.
 *
 * ## No baseline
 *
 * 558 count mismatches were carried in `locale-placeholder-baseline.json` from
 * 2026-07-26 until 2026-09-16, when they were repaired (the value falls back to
 * the English string, which interpolates, instead of a translation that cannot).
 * The inventory and the reasoning are in the workspace's
 * `docs/locale-placeholder-drift.md`. The baseline is GONE on purpose: a gate
 * with an append-only exception list is a gate that stops failing (AGENTS.md
 * Rule 23). Repair the value or fix the generator — do not re-add a baseline.
 *
 * ## Usage
 *
 *   node scripts/check-locale-placeholders.js            # report + exit 1 on any problem
 *   node scripts/check-locale-placeholders.js --quiet    # exit code only
 *
 * @module
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const LOCALE_DIRS = [join(ROOT, 'packages/app/locales'), join(ROOT, 'packages/api/locales')]
const SKIP = new Set(['en.ts', 'index.ts', 'types.ts'])

/**
 * Every `{{…}}` placeholder in a value, with its raw inner text, in order.
 *
 * Deliberately looser than the runtime regex (`\{\{\s*(\w+)\s*\}\}`): a
 * translated name like `{{ርዕስ}}` does not match `\w+` at all, so a check built on
 * the runtime pattern would not even SEE the worst cases.
 *
 * @param source - A string (a single value, or a whole file).
 * @returns The placeholder names, in order, whitespace-trimmed.
 */
export function placeholders(source) {
  return [...source.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map((match) => match[1])
}

/**
 * Read a JavaScript string literal starting at `start`.
 *
 * @param source - File contents.
 * @param start - Index of the opening quote (`'`, `"` or a backtick).
 * @returns `{ value, end }` — the decoded text and the index after the closing quote.
 */
function readStringLiteral(source, start) {
  const quote = source[start]
  const SIMPLE = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' }
  let out = ''
  let i = start + 1
  while (i < source.length) {
    const ch = source[i]
    if (ch === '\\') {
      const next = source[i + 1]
      // A \uXXXX escape must be DECODED, not skipped: 101 files store whole
      // values as escapes, and a reader that drops them compares a value the
      // app never sees. A brace can hide in one (\u007b is "{").
      if (next === 'u' && source[i + 2] === '{') {
        const close = source.indexOf('}', i + 3)
        out += String.fromCodePoint(parseInt(source.slice(i + 3, close), 16))
        i = close + 1
        continue
      }
      if (next === 'u') {
        out += String.fromCharCode(parseInt(source.slice(i + 2, i + 6), 16))
        i += 6
        continue
      }
      if (next === 'x') {
        out += String.fromCharCode(parseInt(source.slice(i + 2, i + 4), 16))
        i += 4
        continue
      }
      out += SIMPLE[next] ?? next
      i += 2
      continue
    }
    if (ch === quote) return { value: out, end: i + 1 }
    out += ch
    i += 1
  }
  return { value: out, end: source.length }
}

/**
 * Key → value for a locale table, read exactly as the module exports it.
 *
 * A regex over lines is not enough and it went blind where it mattered most:
 * 122 locale files hold BACKTICK values (the legal-default privacy policy is one
 * multi-line template literal carrying twenty `{{appName}}` tokens), and a
 * line-oriented reader saw only the first line of each. Prettier also wraps a
 * long value onto the line after its key. This scanner handles all three because
 * it reads literals, not lines.
 *
 * @param source - File contents.
 * @returns Map of key → decoded value.
 */
export function valuesByKey(source) {
  const map = new Map()
  let i = 0
  let key = null
  let expectValue = false
  while (i < source.length) {
    const ch = source[i]
    if (ch === '/' && source[i + 1] === '/') {
      const nl = source.indexOf('\n', i)
      i = nl < 0 ? source.length : nl + 1
      continue
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i)
      i = end < 0 ? source.length : end + 2
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      const { value, end } = readStringLiteral(source, i)
      if (expectValue) {
        map.set(key, value)
        key = null
        expectValue = false
      } else {
        key = value
      }
      i = end
      continue
    }
    if (ch === ':') {
      expectValue = key !== null
      i += 1
      continue
    }
    if (ch === ',' || ch === '{' || ch === '}') {
      key = null
      expectValue = false
      i += 1
      continue
    }
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    // Anything else (an identifier, a type annotation such as
    // `export const af: Partial<IdeTranslations> = {`) cannot be a string value.
    expectValue = false
    key = null
    i += 1
  }
  return map
}

/**
 * Locale bond directories that define an `en.ts`.
 *
 * @returns Absolute package directories.
 */
export function localePackages() {
  const found = []
  for (const base of LOCALE_DIRS) {
    let entries
    try {
      entries = readdirSync(base)
    } catch (_error) {
      // Intentional noop: a checkout without this stack is not an error.
      continue
    }
    for (const name of entries) {
      const dir = join(base, name)
      if (!statSync(dir).isDirectory()) continue
      try {
        statSync(join(dir, 'src', 'en.ts'))
        found.push(dir)
      } catch (_error) {
        // Intentional noop: no en.ts — not a locale bond in the shape this checks.
      }
    }
  }
  return found
}

/**
 * Compare two placeholder lists as multisets.
 *
 * @param a - First list.
 * @param b - Second list.
 * @returns True when both hold the same names the same number of times.
 */
const sameMultiset = (a, b) =>
  a.length === b.length && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())

/**
 * Classify one translated value against its English source.
 *
 * @param englishValue - The `en.ts` value for the same key.
 * @param value - The translated value.
 * @returns `null` when intact, else `{ klass, detail }`.
 *   `RENAMED` — same count, different names: the call site supplies `count`, the
 *     value asks for `{{ಎಣಿಕೆ}}`, and the raw token renders.
 *   `GAINED` — a token English does not define: nothing is ever passed for it,
 *     so the user sees literal braces.
 *   `LOST` — a token English defines is missing: the value the call site passed
 *     never appears.
 *   `MALFORMED` — broken braces or leaked masking markup.
 */
export function classify(englishValue, value) {
  const want = placeholders(englishValue)
  const have = placeholders(value)
  if (/<\s*\/?\s*x\s*>/i.test(value)) {
    return { klass: 'MALFORMED', detail: 'leaked <x> translation-tool markup' }
  }
  if (/MOLPH\d/i.test(value)) {
    return { klass: 'MALFORMED', detail: 'leaked MOLPH placeholder sentinel' }
  }
  const stripped = value.replace(/\{\{[^{}]*\}\}/g, '')
  if (stripped.includes('{{')) return { klass: 'MALFORMED', detail: 'unclosed {{' }
  if (stripped.includes('}}')) return { klass: 'MALFORMED', detail: 'unopened }}' }
  if (/\{\{\s*\}\}/.test(value)) return { klass: 'MALFORMED', detail: 'empty {{}}' }
  for (const name of want) {
    // `{name}` renders literally — only `{{name}}` interpolates.
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp(`(?<!\\{)\\{\\s*${escaped}\\s*\\}(?!\\})`).test(value)) {
      return { klass: 'MALFORMED', detail: `{${name}} has single braces` }
    }
  }
  if (sameMultiset(want, have)) return null
  const shape = `[${have.join(', ') || 'none'}] vs en's [${want.join(', ') || 'none'}]`
  if (want.length === have.length) return { klass: 'RENAMED', detail: shape }
  if (have.length > want.length) return { klass: 'GAINED', detail: shape }
  return { klass: 'LOST', detail: shape }
}

/**
 * Sweep every locale bond and report every placeholder defect.
 *
 * @returns `{ problems, drifts, filesScanned, packagesScanned }` — `problems` are
 *   human-readable lines, `drifts` the structured records behind them.
 */
export function analyzeLocalePlaceholders() {
  const problems = []
  const drifts = []
  let filesScanned = 0
  let packagesScanned = 0

  for (const pkg of localePackages()) {
    packagesScanned += 1
    const src = join(pkg, 'src')
    const englishByKey = valuesByKey(readFileSync(join(src, 'en.ts'), 'utf8'))
    const known = new Set()
    for (const value of englishByKey.values())
      for (const name of placeholders(value)) known.add(name)
    const label = pkg.slice(ROOT.length + 1)

    for (const file of readdirSync(src)) {
      if (!file.endsWith('.ts') || SKIP.has(file)) continue
      filesScanned += 1
      const where = `${label}/src/${file}`
      const translated = valuesByKey(readFileSync(join(src, file), 'utf8'))

      // HTML entities — the same pipeline's earlier symptom, kept so a
      // regression cannot land silently a second time.
      for (const [key, value] of translated) {
        if (/&(?:#\d+|amp|quot|lt|gt|#x[0-9a-f]+);/i.test(value)) {
          problems.push(`${where}: '${key}' holds an HTML entity (see decode-locale-entities.js)`)
        }
      }

      for (const [key, value] of translated) {
        const englishValue = englishByKey.get(key)
        if (englishValue === undefined) {
          // A key this bond's English does not define: every placeholder in it
          // is unresolvable, because only en.ts's call sites supply values.
          for (const name of placeholders(value)) {
            if (!known.has(name)) {
              problems.push(
                `${where}: '${key}' is not in en.ts and uses {{${name}}} — it renders literally`,
              )
            }
          }
          continue
        }
        const verdict = classify(englishValue, value)
        if (!verdict) continue
        drifts.push({
          where,
          key,
          klass: verdict.klass,
          detail: verdict.detail,
          englishValue,
          value,
        })
        problems.push(`${where}: '${key}' ${verdict.klass} — ${verdict.detail}`)
      }
    }
  }
  return { problems, drifts, filesScanned, packagesScanned }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)

if (isMain) {
  const { problems, filesScanned, packagesScanned } = analyzeLocalePlaceholders()
  if (!process.argv.includes('--quiet')) {
    if (problems.length === 0) {
      console.log(
        `✓ locale placeholders intact (${filesScanned} file(s) across ${packagesScanned} bond(s))`,
      )
    } else {
      console.error(`\n✗ locale placeholder problems (${problems.length}):\n`)
      for (const problem of problems.slice(0, 40)) console.error(`  ${problem}`)
      if (problems.length > 40) console.error(`  … and ${problems.length - 40} more`)
      console.error(
        `\nA placeholder name is a VARIABLE, not prose: it must match en.ts byte for byte\n` +
          `in every language, or the value never substitutes and the UI shows the raw token.\n` +
          `Repair the value (or fall back to the English string, which interpolates) —\n` +
          `there is no baseline to add it to. See docs/locale-placeholder-drift.md.\n`,
      )
    }
  }
  process.exit(problems.length === 0 ? 0 : 1)
}
