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
 * A `// keep-english: <reason>` marker in `en.ts` ({@link keptInEnglish}) is not
 * one: it lets nothing through, it makes the gate require the English value of
 * that key in every language.
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
// `loader.ts` is a locale bond's lazy loader (its exported list of locale codes), not a table.
const SKIP = new Set(['en.ts', 'index.ts', 'types.ts', 'loader.ts'])

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
 *   `CODE` — a Markdown code span English carries is missing or changed (a
 *     command or identifier the reader would type no longer exists), or the
 *     translation adds one English does not have (the backticks render).
 *   `COMMAND` — a slash command English names, with its argument syntax
 *     ({@link commandSpans}), is missing or changed: the reader types
 *     `/kompakteer`, which does not exist.
 *   `NEWLINE` — the value has a different number of line breaks: the text
 *     renders as one run-on line, or breaks where English does not.
 *   `ENGLISH` — the value is still the English text ({@link isUntranslatedCopy}).
 */
export function classify(englishValue, value) {
  const want = placeholders(englishValue)
  const have = placeholders(value)
  if (/<\s*\/?\s*(?:x|span)\b[^>]*>/i.test(value)) {
    return { klass: 'MALFORMED', detail: 'leaked translation-tool markup' }
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
  if (!sameMultiset(want, have)) {
    const shape = `[${have.join(', ') || 'none'}] vs en's [${want.join(', ') || 'none'}]`
    if (want.length === have.length) return { klass: 'RENAMED', detail: shape }
    if (have.length > want.length) return { klass: 'GAINED', detail: shape }
    return { klass: 'LOST', detail: shape }
  }
  const codeWant = codeSpans(englishValue)
  const codeHave = codeSpans(value)
  if (!sameMultiset(codeWant, codeHave)) {
    const missing = codeWant.filter((span) => !codeHave.includes(span))
    const gained = codeHave.filter((span) => !codeWant.includes(span))
    return {
      klass: 'CODE',
      detail: missing.length
        ? `${missing.join(', ')} not kept verbatim`
        : `gains ${gained.join(', ')}, which en does not mark as code: UI text does not render Markdown, so the backticks show`,
    }
  }
  const commands = commandSpans(englishValue)
  const lostCommand = commands.find((span) => !commandSpans(value).includes(span))
  if (lostCommand !== undefined) {
    return { klass: 'COMMAND', detail: `${lostCommand} not kept verbatim` }
  }
  const breaks = (text) => text.split('\n').length - 1
  if (breaks(englishValue) !== breaks(value)) {
    return {
      klass: 'NEWLINE',
      detail: `${breaks(value)} line break(s) vs en's ${breaks(englishValue)}`,
    }
  }
  if (isUntranslatedCopy(englishValue, value)) {
    return { klass: 'ENGLISH', detail: 'still the English text' }
  }
  return null
}

/** The comment that keeps the key below it in English: `// keep-english: <reason>`. */
const KEEP_ENGLISH_RE = /^\s*\/\/\s*keep-english:(.*)$/

/**
 * The keys an `en.ts` keeps in English in every language, each with its reason.
 *
 * A `// keep-english: <reason>` line comment applies to the next key below it
 * (other comment lines may sit between them). The gate then requires every
 * language to hold exactly the English value, and the translator writes the
 * English value instead of asking a provider. It is for text a machine
 * translation cannot get right and no one has translated by hand: an
 * elliptical fragment ("Thought for 5 seconds") or command help whose argument
 * names are part of the syntax. English is readable there; a confident wrong
 * translation is not (2026-11-13: a pass gave French "Réfléchir pendant une
 * seconde", the infinitive, and "× 0 secondes" for "that many seconds").
 *
 * @param source - The text of an `en.ts`.
 * @returns `{ kept, problems }`: `kept` maps each key to its reason; `problems`
 *   names each marker with no reason or no key below it.
 */
export function keptInEnglish(source) {
  const kept = new Map()
  const problems = []
  let pending = null
  for (const [index, line] of source.split('\n').entries()) {
    const marker = KEEP_ENGLISH_RE.exec(line)
    if (marker) {
      if (pending) problems.push(`line ${pending.line}: keep-english has no key below it`)
      pending = { line: index + 1, reason: marker[1].trim() }
      if (!pending.reason) problems.push(`line ${index + 1}: keep-english needs a reason`)
      continue
    }
    if (!pending || /^\s*(\/\/|\/\*|\*)/.test(line)) continue
    const key = /^\s*(['"])(.+?)\1\s*:/.exec(line)
    if (!key) {
      problems.push(`line ${pending.line}: keep-english has no key below it`)
      pending = null
      continue
    }
    kept.set(key[2], pending.reason)
    pending = null
  }
  if (pending) problems.push(`line ${pending.line}: keep-english has no key below it`)
  return { kept, problems }
}

/**
 * Classify one translated value, honouring a `// keep-english` marker on its key.
 *
 * @param englishValue - The `en.ts` value for the same key.
 * @param value - The translated value.
 * @param keepReason - The key's `keep-english` reason, or undefined when unmarked.
 * @returns `null` when the value is acceptable, a `KEPT` verdict when a marked
 *   key holds anything but its English value, else {@link classify}'s verdict.
 */
export function checkValue(englishValue, value, keepReason) {
  if (keepReason === undefined) return classify(englishValue, value)
  if (value === englishValue) return null
  return {
    klass: 'KEPT',
    detail: `en.ts keeps this key in English (${keepReason}); write the English value`,
  }
}

/**
 * A slash command (or an absolute path) and the argument syntax written after
 * it: `<name>`, `[on | off]`, `--plan|--execute`, `?`. It cannot follow an ASCII
 * letter, digit or `. / < ~ -`, so `and/or`, `1/2`, `.agents/skills` and `</p>`
 * are not commands; a CJK sentence puts one straight after a character
 * (`用法：/timestamps`).
 */
export const COMMAND_RE =
  /(?<![\w./<~-])\/[a-z][\w-]*(?:\/[\w.-]+)*(?:[ \t]+(?:<[\w-]+>|\[[^\]\n]{1,40}\]|--[a-z][\w-]*(?:\|--[a-z][\w-]*)*|\?(?![\w?])))*/g

/**
 * Every slash command in a value outside its code spans, with its argument
 * syntax (`/effort --plan|--execute <level>`), in order.
 *
 * UI text does not render Markdown, so English names a command the reader types
 * in plain text (`Usage: /timestamps [on | off]`). It must survive translation
 * byte for byte, as a code span does: a machine translation gave Afrikaans
 * `/tydstempels [aan | af]` and `/effort --plan|--uitvoer`, commands that do
 * not exist.
 *
 * @param value - A string value.
 * @returns The command spans.
 */
export function commandSpans(value) {
  return value.replace(/`[^`\n]+`/g, ' ').match(COMMAND_RE) ?? []
}

/**
 * Whether a translated value is its English source copied unchanged.
 *
 * A key added to `en.ts` used to be copied into every language file as English
 * to satisfy the bond's types, and nothing translated it afterwards: 15,122
 * values across 27 bonds read English in every locale (2026-11-13). Only a
 * sentence counts — three or more words outside its `{{tokens}}`, code spans and
 * slash commands, and not an email address or URL — so "OK", "Email", a product
 * name or a script example (`#!/bin/sh\nnpm test`), which can legitimately read
 * the same, do not.
 *
 * @param englishValue - The `en.ts` value for the same key.
 * @param value - The translated value.
 * @returns True when `value` is the untranslated English sentence.
 */
export function isUntranslatedCopy(englishValue, value) {
  if (value !== englishValue) return false
  if (/^\S+@\S+\.\S+$/.test(englishValue) || englishValue.includes('://')) return false
  // Tokens, code spans and commands are not English: they read the same in every language.
  const words =
    englishValue
      .replace(/\{\{[^{}]*\}\}|`[^`\n]+`/g, ' ')
      .replace(COMMAND_RE, ' ')
      .match(/\p{L}{2,}/gu) ?? []
  return words.length >= 3
}

/**
 * Every Markdown code span (`` `npm install {{library}}` ``) in a value, in order.
 *
 * English marks a command, a package name or an identifier this way because the
 * reader TYPES or searches for it, so a translation must carry it byte for byte:
 * a machine translation that turns `npm install` into `npm wụnye` gives the
 * reader a command that does not exist.
 *
 * @param value - A string value.
 * @returns The code spans, backticks included.
 */
export function codeSpans(value) {
  return value.match(/`[^`\n]+`/g) ?? []
}

/**
 * Whole numbers a count can take, enough to reach every CLDR integer category.
 * 0 comes after the small numbers: "5 файлов" is a more natural sentence to
 * translate than "0 файлов", so 0 is the sample only for a category it alone
 * selects (Arabic's `zero`).
 */
const SAMPLE_COUNTS = [
  ...Array.from({ length: 200 }, (_, n) => n + 1),
  0,
  1_000,
  10_000,
  100_000,
  1_000_000,
  10_000_000,
]

/**
 * The plural categories beyond `one`/`other` a language selects for a whole
 * number, each with the first count in {@link SAMPLE_COUNTS} that selects it. Czech's `many`, for
 * example, only ever applies to a fraction, which a count never is, so it is
 * not listed; Spanish's `many` is (a million: "1 000 000 de archivos").
 *
 * @param lang - A language code.
 * @returns category → sample count.
 */
export function countPluralForms(lang) {
  const rules = new Intl.PluralRules(lang)
  const forms = new Map()
  for (const n of SAMPLE_COUNTS) {
    const category = rules.select(n)
    if (category !== 'one' && category !== 'other' && !forms.has(category)) forms.set(category, n)
  }
  return forms
}

/**
 * The pluralized keys of a bond: each base `key` whose English defines
 * `key_other`, which `t(key, values, { count })` resolves through.
 *
 * @param englishByKey - The bond's `en.ts` values.
 * @returns The base keys, in `en.ts` order.
 */
export function pluralBases(englishByKey) {
  return [...englishByKey.keys()].filter((k) => k.endsWith('_other')).map((k) => k.slice(0, -6))
}

/**
 * The plural forms a language uses that its table lacks for a pluralized key.
 *
 * The i18n core picks `key_<category>` from `Intl.PluralRules(locale)` and falls
 * back to `key_other` when that form is missing, so without `_few` Russian reads
 * "2 файлов" where it says "2 файла". English only has `one` and `other`; every
 * other CLDR category a language selects for a whole number (`zero`, `two`,
 * `few`, `many` — {@link countPluralForms}) must be written for it.
 *
 * @param bases - The bond's pluralized keys ({@link pluralBases}).
 * @param lang - The language code (the file name without `.ts`).
 * @param translated - That language's values.
 * @returns One `{ base, category }` per missing form.
 */
export function missingPluralForms(bases, lang, translated) {
  if (bases.length === 0) return []
  const categories = [...countPluralForms(lang).keys()]
  const missing = []
  for (const base of bases)
    for (const category of categories)
      if (!translated.has(`${base}_${category}`)) missing.push({ base, category })
  return missing
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
    const englishSource = readFileSync(join(src, 'en.ts'), 'utf8')
    const englishByKey = valuesByKey(englishSource)
    const { kept, problems: markerProblems } = keptInEnglish(englishSource)
    for (const problem of markerProblems)
      problems.push(`${pkg.slice(ROOT.length + 1)}/src/en.ts: ${problem}`)
    const known = new Set()
    for (const value of englishByKey.values())
      for (const name of placeholders(value)) known.add(name)
    const label = pkg.slice(ROOT.length + 1)
    const plurals = pluralBases(englishByKey)

    for (const file of readdirSync(src)) {
      if (!file.endsWith('.ts') || SKIP.has(file)) continue
      filesScanned += 1
      const where = `${label}/src/${file}`
      const translated = valuesByKey(readFileSync(join(src, file), 'utf8'))

      for (const { base, category } of missingPluralForms(
        plurals,
        file.slice(0, -'.ts'.length),
        translated,
      )) {
        drifts.push({ where, key: `${base}_${category}`, klass: 'PLURAL' })
        problems.push(
          `${where}: '${base}' PLURAL — this language has a "${category}" form; add '${base}_${category}'`,
        )
      }

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
        const verdict = checkValue(englishValue, value, kept.get(key))
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
          `A KEPT value translates a key en.ts marks \`// keep-english: <reason>\`: restore the\n` +
          `English value (the translator below writes it).\n` +
          `An ENGLISH value is a key that was never translated. Translate the bond (in the\n` +
          `workspace: node scripts/translate-bond-gaps.mjs --apply --pkg=<bond>, which fills\n` +
          `missing keys and plural forms and retranslates every value this check refuses)\n` +
          `and write by hand any value it still refuses —\n` +
          `there is no baseline to add it to. See docs/locale-placeholder-drift.md.\n`,
      )
    }
  }
  process.exit(problems.length === 0 ? 0 : 1)
}
