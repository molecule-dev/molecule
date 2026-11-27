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
 * The same step detached grammatical particles from what they belong to (2026-11-27): Armenian wrote
 * `` `setProvider()` ը `` for `` `setProvider()`-ը ``, Korean `{{provider}} 에 대한` for
 * `{{provider}}에 대한`, and Swahili said "make a phone call" (`piga simu`) wherever English said
 * "Call" a function. Every token was intact, so nothing above saw them; {@link detachedParticle} and
 * {@link phoneCallForFunction} do.
 *
 * ## Usage
 *
 *   node scripts/check-locale-placeholders.js            # report + exit 1 on any problem
 *   node scripts/check-locale-placeholders.js --quiet    # exit code only
 *   node scripts/check-locale-placeholders.js --all      # print every problem, not the first 40
 *   node scripts/check-locale-placeholders.js --root=<dir>  # the tables under another checkout
 *                                                          # (a copy of an older tree)
 *
 * @module
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { isMainModule } from './lib/is-main.mjs'

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
 * @param [root] - The checkout to read; this one unless a copy of another tree is named.
 * @returns Absolute package directories.
 */
export function localePackages(root = ROOT) {
  const found = []
  for (const base of LOCALE_DIRS.map((dir) => join(root, dir.slice(ROOT.length)))) {
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
 * @param [lang] - The translation's language, if known.
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
 *   `QUOTED` — a token English writes inside quotes or angle brackets
 *     (`"{{name}}"`, `<{{element}}>`, {@link quotedTokens}) is not kept as that
 *     unit: the quotes no longer surround the value.
 *   `SPACING` — a space splits a token from the suffix English writes against
 *     it (`{{name}}'s` → `{{name}} 'nin`), or sits between a code span and the
 *     full stop or comma after it ({@link CODE_SPAN_SPACE_RE}).
 *   `ENGLISH` — the value is still the English text ({@link isUntranslatedCopy}).
 *     {@link copiedEnglish} adds the short values a whole file never translated.
 */
export function classify(englishValue, value, lang) {
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
  if (CODE_SPAN_SPACE_RE.test(value) && !CODE_SPAN_SPACE_RE.test(englishValue)) {
    return {
      klass: 'SPACING',
      detail:
        'a space between a code span and the full stop or comma after it; write `name`. as en does',
    }
  }
  const commands = commandSpans(englishValue)
  const lostCommand = commands.find((span) => !commandSpans(value, lang).includes(span))
  if (lostCommand !== undefined) {
    return { klass: 'COMMAND', detail: `${lostCommand} not kept verbatim` }
  }
  const lostQuoted = quotedTokens(englishValue).find((unit) => !value.includes(unit))
  if (lostQuoted !== undefined) {
    return { klass: 'QUOTED', detail: `${lostQuoted} not kept verbatim` }
  }
  const splitSuffix = [...englishValue.matchAll(/(\{\{[^{}]*\}\})['’]\p{L}/gu)].find(([, token]) =>
    new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} +['’]\\p{L}`, 'u').test(value),
  )
  if (splitSuffix !== undefined) {
    return {
      klass: 'SPACING',
      detail: `a space splits ${splitSuffix[1]} from the suffix English writes against it`,
    }
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
 * The same marker in a language file keeps its key English in that language
 * only: a name the language writes in Latin script (Russian and Greek write
 * `Ethernet`, where Japanese writes `イーサネット`), which {@link copiedEnglish}
 * would otherwise refuse there.
 *
 * @param source - The text of an `en.ts` or of one language file.
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
 * @param [lang] - The translation's language, if known.
 * @returns `null` when the value is acceptable, a `KEPT` verdict when a marked
 *   key holds anything but its English value, else {@link classify}'s verdict.
 */
export function checkValue(englishValue, value, keepReason, lang) {
  if (keepReason === undefined) return classify(englishValue, value, lang)
  if (value === englishValue) return null
  return {
    klass: 'KEPT',
    detail: `en.ts keeps this key in English (${keepReason}); write the English value`,
  }
}

const COMMAND_START = /(?<![\w./<~-])/.source

/**
 * Match a slash command (or absolute path) and its argument syntax:
 * `<name>`, `[on | off]`, `--plan|--execute`, `?`.
 *
 * @param start - Boundary before the slash.
 * @param hyphen - Hyphens that can be part of the command or flag.
 * @returns The command pattern.
 */
function commandPattern(start, hyphen) {
  const label = `[a-z](?:\\w|${hyphen})*`
  const path = `\\/${label}(?:\\/(?:[\\w.]|${hyphen})+)*`
  const flag = `--${label}`
  const args = `(?:[ \\t]+(?:<[\\w-]+>|\\[[^\\]\\n]{1,40}\\]|${flag}(?:\\|${flag})*|\\?(?![\\w?])))*`
  return new RegExp(`${start}${path}${args}`, 'gu')
}

/** Commands start at their own boundary, so `and/or`, `1/2`, relative paths and tags stay prose. */
export const COMMAND_RE = commandPattern(COMMAND_START, '-')

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
 * @param [lang] - The value's language, if known, for prefixes and suffixes joined to commands.
 * @returns The command spans.
 */
export function commandSpans(value, lang) {
  return (
    value.replace(/`[^`\n]+`/g, ' ').match(JOINED_COMMAND_PATTERNS.get(lang) ?? COMMAND_RE) ?? []
  )
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
 * A token English writes inside a pair of straight quotes or angle brackets:
 * `"{{name}}"`, `'{{name}}'`, `<{{element}}>`.
 */
export const QUOTED_TOKEN_RE = /"\{\{[^{}]+\}\}"|'\{\{[^{}]+\}\}'|<\{\{[^{}]+\}\}>/g

/**
 * Every token a value writes inside quotes or angle brackets, with them, in order.
 *
 * The quotes mark where the value starts and ends (`Route "{{name}}" not found`),
 * so a translation keeps them around it as one unit. Machine translation moved
 * them: Afrikaans came back as `Roete " {{name}} "nie gevind nie`, Arabic as
 * `طريق " {{name}} "غير موجود"` (680 values of 10 keys, 2026-11-22).
 *
 * @param value - A string value.
 * @returns The quoted tokens.
 */
export function quotedTokens(value) {
  return value.match(QUOTED_TOKEN_RE) ?? []
}

/**
 * The English words in a value that a translation into another language would
 * change: Latin-script words of two or more letters with a lowercase letter,
 * outside its `{{tokens}}`, code spans and slash commands.
 *
 * An acronym (`HTTP`, `ISO`, `GPS`) is not counted, nor a unit written against a
 * token (`{{ms}}ms`, `{{value}} mm`), nor an email address or URL: they read the
 * same in every language. A product name does count (`GitHub`); en.ts marks it
 * `// keep-english`.
 *
 * @param value - The English value.
 * @returns The words.
 */
export function englishWords(value) {
  if (/^\S+@\S+\.\S+$/.test(value) || value.includes('://')) return []
  const words =
    value
      .replace(/`[^`\n]+`/g, ' ')
      .replace(COMMAND_RE, ' ')
      .replace(/\{\{[^{}]*\}\}(?:\p{L}{1,3}(?!\p{L})| \p{L}{1,2}(?!\p{L}))?/gu, ' ')
      .match(/\p{Script=Latin}+(?:['’-]\p{Script=Latin}+)*/gu) ?? []
  return words.filter((word) => word.length >= 2 && word !== word.toUpperCase())
}

/**
 * The script a language is written in (`Latn`, `Cyrl`, `Jpan`, …), from its
 * likely subtags.
 *
 * @param lang - A locale file's language code (`ja`, `sr`, `zh-TW`).
 * @returns The ISO 15924 script code, or undefined when `lang` is not a
 *   language tag (a bond's own `loadContent.ts`).
 */
export function writingScript(lang) {
  try {
    return new Intl.Locale(lang).maximize().script
  } catch (_error) {
    // Intentional: Intl.Locale throws RangeError on a string that is not a language tag.
    return undefined
  }
}

/**
 * The keys of one language file whose value is still its English text, beyond
 * the sentences {@link isUntranslatedCopy} finds.
 *
 * A short label can read the same in English and another language ("Email",
 * "Status" in German), so a value is not judged alone. Two things settle it:
 *
 * - The language is not written in Latin script. An English word in a Japanese,
 *   Russian or Arabic file is untranslated ("Select all" shown to a Japanese
 *   reader). A product name is the exception, marked `// keep-english` in en.ts.
 * - The file was copied, not translated: at least three of its values, and at
 *   least half of those with English words, are still the English text.
 *   Translation leaves a few labels the same; a file stubbed with English and
 *   never translated holds almost nothing else (layer-panel's Afrikaans: 7 of 7).
 *
 * Before 2026-11-22 only sentences of three words counted, so 5,448 shorter
 * values in non-Latin languages and 196 copied files passed (29 bonds).
 *
 * @param englishByKey - The bond's `en.ts` values.
 * @param translated - The language file's values.
 * @param lang - The language code.
 * @param kept - The keys en.ts marks `keep-english` ({@link keptInEnglish}).
 * @returns Each such key, with the reason.
 */
export function copiedEnglish(englishByKey, translated, lang, kept = new Map()) {
  const out = new Map()
  const script = writingScript(lang)
  if (script === undefined) return out
  const translatable = [...englishByKey].filter(
    ([key, english]) => !kept.has(key) && translated.has(key) && englishWords(english).length > 0,
  )
  const copies = translatable.filter(([key, english]) => translated.get(key) === english)
  if (script !== 'Latn') {
    for (const [key] of copies)
      out.set(key, `still English, in a language written in ${script} script`)
  } else if (copies.length >= 3 && copies.length * 2 >= translatable.length) {
    for (const [key] of copies)
      out.set(
        key,
        `still English, like ${copies.length} of the file's ${translatable.length} values: the file was copied, not translated`,
      )
  }
  return out
}

/**
 * A code span with a space before the full stop or comma after it (`` `MoleculeProvider` . ``).
 * Machine translation added that space in 6 bonds (2026-11-20). No language spaces these
 * marks so: French puts a space only before ; : ! ?, and Finnish's `` `setProvider()` -funktiota ``
 * is a hyphen, which this does not match.
 */
export const CODE_SPAN_SPACE_RE = /`[^`\n]+` [.,،]/

/**
 * The keys whose value is still the English text in every language file of a bond, when the
 * value is too short for {@link isUntranslatedCopy} to call one file's copy English.
 *
 * One Latin-script file holding English "Show less" could be a fair translation; all 78
 * holding it is a stub nobody translated: June 2026's key fan-outs copied English into every
 * file, and 103 IDE labels stayed English that way until 2026-11-20. {@link copiedEnglish}
 * sees a whole file copied; this sees one key copied into every file. A value that reads the
 * same in every language (a product name) says so with `// keep-english` in `en.ts`.
 *
 * @param englishByKey - The bond's `en.ts` values.
 * @param translations - Each language file's values.
 * @param kept - The keys `en.ts` keeps in English.
 * @returns The keys, in `en.ts` order (none for a bond with fewer than two languages).
 */
export function untranslatedEverywhere(englishByKey, translations, kept) {
  if (translations.length < 2) return []
  const keys = []
  for (const [key, englishValue] of englishByKey) {
    // A sentence is already refused file by file, as ENGLISH.
    if (kept.has(key) || isUntranslatedCopy(englishValue, englishValue)) continue
    if (englishWords(englishValue).length === 0) continue
    if (translations.every((values) => values.get(key) === englishValue)) keys.push(key)
  }
  return keys
}

/** A token or code span, then a space, then a hyphenated suffix: `{{total}} -dən`. */
const SPLIT_HYPHEN_RE = /(\{\{[^{}]*\}\}|`[^`\n]+`) +-\p{L}/u

/**
 * Whether a translation splits a token or code span from the hyphenated suffix
 * its language writes against it. Azerbaijani writes `{{total}}-dən`, German
 * ``\`NetworkProvider\`-Implementierung``; machine translation returned both with a
 * space before the hyphen. Finnish is the exception: a compound whose first part
 * has a space in it takes a spaced hyphen (`HTTP 500 -vastaus`).
 *
 * @param englishValue - The `en.ts` value for the same key.
 * @param value - The translated value.
 * @param lang - The language code.
 * @returns A `SPACING` verdict, or null.
 */
export function splitHyphenSuffix(englishValue, value, lang) {
  if (lang === 'fi' || SPLIT_HYPHEN_RE.test(englishValue)) return null
  const split = SPLIT_HYPHEN_RE.exec(value)
  return split
    ? { klass: 'SPACING', detail: `a space splits ${split[1]} from its hyphenated suffix` }
    : null
}

/** A code name in backticks or a `{{placeholder}}`. */
const NAME_RE = '`[^`\\n]+`|\\{\\{[^{}]*\\}\\}'
/** A number in digits (`3`, `1.5`): a particle is written against it as against a name. */
const NUMBER_RE = /\p{Nd}+(?:[.,]\p{Nd}+)*/u.source
/**
 * A name a value does not mark as code: `setProvider()`, `@molecule/app-icons`, `multipart/form-data`.
 * In a language not written in Latin script it is a word of its own kind, and a particle after it is
 * that word's. Basque is written in Latin script, where this would be every word, so it is not
 * used there.
 */
const PLAIN_NAME_RE =
  /[.@]?[\p{Script=Latin}][\p{Script=Latin}\p{M}\d@/_-]*(?:\.[\p{Script=Latin}\p{M}\d/_-]+)*(?:\(\))?/u
    .source
/** Quotes and brackets around a name stay in place when the particle is joined. */
const OPENERS = /["'([\u2018\u201c]*/u.source
const CLOSERS = /["')\]\u2019\u201d]*/u.source
/** Horizontal whitespace, including a space left beside an already written hyphen. */
const APART = /-?[^\S\r\n]+-?/u.source
/**
 * The particle is a whole word: no letter, mark or digit goes on after it. A word that merely begins
 * with the particle's syllable is not the particle (Korean for "read {{source}} logs" and "fetch
 * {{host}}", Armenian for "{{count}} selected"), and neither is a unit (Korean writes the "s" of
 * "{{time}}s" as a two-syllable word that begins like the particle for "at").
 */
const WORD_END = /(?![\p{L}\p{M}\p{N}_\u200c\u200d])/u.source
/**
 * The prefix is a word of its own: no letter, mark or digit stands before it. It does not touch the
 * end of a token (`{{hours}}<letter>`: the unit letter of a number, not a prefix of the next
 * placeholder), nor an acronym's closing quote mark.
 */
const WORD_START = /(?<![\p{L}\p{M}\p{N}_`}%])(?<![\p{L}\p{N}]["'\u05f3\u05f4])/u.source
/**
 * Whether English writes the unit "s" of seconds against a name: `{{time}}s`, `{{value}} s`.
 *
 * @param englishValue - The `en.ts` value for the same key, when known.
 * @param name - The name the particle stands next to.
 * @returns True when the name is a code name or placeholder and English writes that unit against it.
 */
function secondsInEnglish(englishValue, name) {
  if (englishValue === undefined) return false
  const token = new RegExp(NAME_RE, 'u').exec(name)?.[0]
  if (token === undefined) return false
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${escaped} ?s${WORD_END}`, 'u').test(englishValue)
}

/**
 * The suffixes and prefixes a language writes against the word they belong to, each a list of code
 * points. They are never typed characters: the sweep that found this defect was written with one wrong
 * code point (a Han character for an Armenian letter), matched nothing for that suffix, and left three
 * values out of its list.
 *
 * - Armenian, Georgian, Malayalam and Basque write a case suffix against a code name or placeholder
 *   with a hyphen: `` `setProvider()`-ը ``, `{{bond}}-ից`, `{{bond}}-დან`, `{{bond}}-ൽ`, `{{core}}-tik`.
 * - Korean writes a particle straight against it: `{{bond}}에서`, `` `provider`를 ``, `{{label}}에게`.
 * - Hebrew joins a one-letter prefix to a code name, a placeholder, a slash command, a Latin word
 *   or a number with a hyphen, as in `מ-{{bond}}`.
 *
 * `after` lists suffixes, `before` lists prefixes, and `join` is what stands between (empty for
 * Korean). Georgian also uses its `unitLetter` to spell the "s" of `{{time}}s`. The matching English
 * token identifies those uses.
 */
export const JOINED_PARTICLES = Object.freeze({
  hy: {
    name: 'Armenian',
    join: '-',
    after: [
      [0x56b, 0x581], // "from"
      [0x568], // "the"
      [0x56b, 0x576], // "to"
      [0x578, 0x582, 0x574], // "in"
      [0x578, 0x57e], // "with"
      [0x56b], // "of", "to"
    ],
  },
  ka: {
    name: 'Georgian',
    join: '-',
    after: [
      [0x10d8, 0x10e1, 0x10d7, 0x10d5, 0x10d8, 0x10e1], // "for"
      [0x10d3, 0x10d0, 0x10dc], // "from"
      [0x10e8, 0x10d8], // "in"
      [0x10d8, 0x10d7], // "with", "by"
      [0x10d8, 0x10e1], // "of"
      [0x10d6, 0x10d4], // "on"
      [0x10db, 0x10d0], // "the doer"
      [0x10e1], // "to", "of"
    ],
    unitLetter: [0x10e1],
  },
  ml: {
    name: 'Malayalam',
    join: '-',
    after: [
      [0xd32, 0xd47, 0xd15, 0xd4d, 0xd15, 0xd4d], // "to", "towards"
      [0xd28, 0xd41, 0xd33, 0xd4d, 0xd33], // "for"
      [0xd32, 0xd4d, 0x200d], // "in", "at": the same letter as below, with a zero-width joiner
      [0xd2f, 0xd41, 0xd1f, 0xd46], // "of", after a vowel
      [0xd28, 0xd4d, 0xd31, 0xd46], // "of", after a consonant
      [0xd7d], // "in", "at"
      [0xd7c], // alternate spelling in the existing check
      [0xd28, 0xd4d], // "to", "for"
      [0xd28, 0xd46], // "the object"
      [0xd06, 0xd2f, 0xd3f], // "as"
      [0xd2e, 0xd3e, 0xd2f, 0xd3f], // "with"
    ],
  },
  eu: {
    name: 'Basque',
    join: '-',
    after: [
      [0x72, 0x65, 0x6b, 0x69, 0x6e], // "with"
      [0x72, 0x61, 0x6b, 0x6f], // "for"
      [0x74, 0x69, 0x6b], // "from"
      [0x72, 0x65, 0x6e], // "of"
      [0x72, 0x61], // "to"
      [0x72, 0x69], // "to"
      [0x6e], // "in"
      [0x6b], // "the doer"
    ],
  },
  ko: {
    name: 'Korean',
    join: '',
    after: [
      [0xc5d0, 0xc11c], // "at", "from"
      [0xc5d0, 0xac8c], // "to"
      [0xc758], // "of"
      [0xb97c], // the object particle after a vowel
      [0xc744], // the object particle after a consonant
      [0xac00], // the subject particle after a vowel
      [0xc5d0], // "to", "at"
      [0xb85c], // "to", "with"
      [0xb294], // the topic particle after a vowel
      [0xc774], // the subject particle after a consonant
      [0xc740], // the topic particle after a consonant
      [0xc73c, 0xb85c], // "to", "with": after a consonant
      [0xae4c, 0xc9c0], // "until"
      [0xbd80, 0xd130], // "from"
      [0xc785, 0xb2c8, 0xb2e4], // "is": the copula, polite
    ],
  },
  he: {
    name: 'Hebrew',
    join: '-',
    before: [
      [0x5de], // "from"
      [0x5dc], // "to"
      [0x5d1], // "in", "at"
      [0x5e9], // "that"
      [0x5db], // "like", "as"
      [0x5d5], // "and"
      [0x5d4], // "the"
    ],
  },
})

/**
 * Build a pattern from the locale's registered particles.
 *
 * @param list - Particles as code point arrays.
 * @returns A pattern matching the longest available particle first.
 */
function particleAlternatives(list) {
  return list
    .map((points) => String.fromCodePoint(...points))
    .sort((a, b) => b.length - a.length)
    .join('|')
}

// Only the current language's recognized joins can change where a command starts
// or ends. A Latin suffix can look like a different command name.
const JOINED_COMMAND_PATTERNS = new Map(
  Object.entries(JOINED_PARTICLES)
    .filter(([lang, language]) => language.join === '-' && writingScript(lang) !== 'Latn')
    .map(([lang, { before, after }]) => {
      const start = before
        ? `(?:${COMMAND_START}|(?<=${WORD_START}(?:${particleAlternatives(before)})-))`
        : COMMAND_START
      const hyphen = after ? `-(?!(?:${particleAlternatives(after)})${WORD_END})` : '-'
      return [lang, commandPattern(start, hyphen)]
    }),
)

const PARTICLE_PATTERNS = new Map(
  Object.entries(JOINED_PARTICLES).map(([lang, language]) => {
    const suffix = language.after !== undefined
    const particles = particleAlternatives(language.after ?? language.before)
    const names = [NAME_RE, NUMBER_RE]
    // In Basque an unquoted command ending in a Latin suffix can look like a different command.
    if (writingScript(lang) !== 'Latn') names.push(COMMAND_RE.source, PLAIN_NAME_RE)
    const name = `(?:${names.join('|')})`
    const detached = suffix
      ? `(${name}${CLOSERS})${APART}(${particles})${WORD_END}`
      : `${WORD_START}(${particles})(?:${APART})?(${OPENERS}${name}${CLOSERS})`
    // Consume a complete token even when nothing is detached from it. This keeps the
    // Latin-name alternative from matching prose inside a code span or a placeholder.
    return [lang, new RegExp(`${detached}|${NAME_RE}`, 'gu')]
  }),
)

/**
 * The part of a value around a match, on one line: enough to find the place by, not a paragraph.
 *
 * @param value - The value the match is in.
 * @param index - Where the match starts.
 * @param length - The match's length.
 * @returns Up to 28 characters on each side of the match, between ellipses where the value goes on.
 */
function excerptAround(value, index, length) {
  const PAD = 28
  const start = Math.max(0, index - PAD)
  const end = Math.min(value.length, index + length + PAD)
  const text = value.slice(start, end).replace(/\s+/g, ' ').trim()
  return `${start > 0 ? '…' : ''}${text}${end < value.length ? '…' : ''}`
}

/**
 * Every place a value writes one of its language's particles as a word apart from the name it
 * belongs to ({@link JOINED_PARTICLES}), from left to right.
 *
 * @param value - The translated value.
 * @param lang - The language code.
 * @param [englishValue] - The `en.ts` value for the same key. It tells the unit "s" of `{{time}}s`
 *   from a particle in the one language that types that unit with a particle's letter
 *   (`unitLetter` of {@link JOINED_PARTICLES}).
 * @returns `{ start, end, name, particle, joined }` for each place: `start` and `end` bound the
 *   detached writing in `value`, `joined` is what to write there. Empty for a language the table
 *   does not list and for a value that holds none.
 */
export function detachedParticlePlaces(value, lang, englishValue) {
  const pattern = PARTICLE_PATTERNS.get(lang)
  if (pattern === undefined) return []
  const language = JOINED_PARTICLES[lang]
  const suffix = language.after !== undefined
  const unitLetter =
    language.unitLetter === undefined ? null : String.fromCodePoint(...language.unitLetter)
  const places = []
  for (const found of value.matchAll(pattern)) {
    const [whole, first, second] = found
    if (first === undefined) continue
    const [name, particle] = suffix ? [first, second] : [second, first]
    if (suffix && particle === unitLetter && secondsInEnglish(englishValue, name)) continue
    places.push({
      start: found.index,
      end: found.index + whole.length,
      name,
      particle,
      joined: suffix ? `${name}${language.join}${particle}` : `${particle}${language.join}${name}`,
    })
  }
  return places
}

/**
 * Whether a value writes one of its language's suffixes or prefixes as a separate word next to the
 * name it belongs to ({@link JOINED_PARTICLES}).
 *
 * @param value - The translated value.
 * @param lang - The language code.
 * @param [englishValue] - The `en.ts` value for the same key ({@link detachedParticlePlaces}).
 * @returns A `SPACING` verdict naming the form to write, or null when the language is not listed or
 *   the value holds none.
 */
export function detachedParticle(value, lang, englishValue) {
  const places = detachedParticlePlaces(value, lang, englishValue)
  const first = places[0]
  if (first === undefined) return null
  const language = JOINED_PARTICLES[lang]
  const suffix = language.after !== undefined
  return {
    klass: 'SPACING',
    detail:
      `${language.name} writes "${first.particle}" against the word it ${suffix ? 'follows' : 'precedes'}: ` +
      `write ${first.joined} in "${excerptAround(value, first.start, first.end - first.start)}"` +
      (places.length > 1 ? ` (and ${places.length - 1} more in this value)` : ''),
  }
}

/**
 * Swahili "piga simu" ("make a phone call") written where the value tells the reader to call a
 * function. Machine translation chose it for every "Call" that stands in front of a code name or a
 * call (`` Piga simu `setProvider()` ``, "Piga simu setPool() kwanza") in 26 values. The phrase must
 * stand directly before the code, so a value that really is about a call ("Piga simu {{phone}}") is
 * not matched.
 */
const PHONE_CALL_RE = /\bpiga simu (?=(`[^`\n]+`|[\w$]+(?:\.[\w$]+)*\([^()\n]*\)))/i

/**
 * The same verb's causative ("-itisha", "have something called") in front of a code name: "na
 * uitishe `setProvider(provider)`" says to have the function called, not to call it. Only the forms
 * of that verb count: "pitisha" (pass) is another verb, and a common one before a code name.
 */
const HAVE_IT_CALLED_RE =
  /\b(?:u|tu|m|wa|a|i|li|ya|ki|vi|zi)?itish(?:e|eni|a|we|je) (?=(`[^`\n]+`))/i

/**
 * Whether a Swahili value says "make a phone call" or "have it called" where it tells the reader to
 * call a function. To call is "-ita": "Ita `setProvider()`" as an instruction on its own, "uite
 * `setProvider()`" after "na" or "au".
 *
 * @param value - The translated value.
 * @param lang - The language code.
 * @returns A `SPACING` verdict naming the verbs to write, or null for any other language and for a
 *   value that says neither.
 */
export function phoneCallForFunction(value, lang) {
  if (lang !== 'sw') return null
  const phoneCall = PHONE_CALL_RE.exec(value)
  const found = phoneCall ?? HAVE_IT_CALLED_RE.exec(value)
  if (found === null) return null
  const phrase = found[0].trim()
  const how = `"Ita ${found[1]}" as an instruction on its own, "uite ${found[1]}" after "na" or "au"`
  return {
    klass: 'SPACING',
    detail:
      found === phoneCall
        ? `"${phrase}" means "make a phone call"; to call a function write ${how} in "${excerptAround(value, found.index, found[0].length)}"`
        : `"${phrase}" means "have it called"; to call a function write ${how} in "${excerptAround(value, found.index, found[0].length)}"`,
  }
}

/**
 * Every value of one language file the gate refuses, with its verdict.
 *
 * @param englishByKey - The bond's `en.ts` values.
 * @param translated - The language file's values.
 * @param lang - The language code.
 * @param kept - The keys en.ts marks `keep-english` ({@link keptInEnglish}).
 * @param everywhere - The bond's keys still English in every language
 *   ({@link untranslatedEverywhere}).
 * @returns Each refused key's `{ klass, detail }` ({@link checkValue},
 *   {@link splitHyphenSuffix}, {@link detachedParticle}, {@link phoneCallForFunction},
 *   {@link copiedEnglish}, `everywhere`).
 */
export function checkFile(
  englishByKey,
  translated,
  lang,
  kept = new Map(),
  everywhere = new Set(),
) {
  const verdicts = new Map()
  for (const [key, value] of translated) {
    const englishValue = englishByKey.get(key)
    if (englishValue === undefined) continue
    const verdict =
      checkValue(englishValue, value, kept.get(key), lang) ??
      splitHyphenSuffix(englishValue, value, lang) ??
      detachedParticle(value, lang, englishValue) ??
      phoneCallForFunction(value, lang)
    if (verdict) verdicts.set(key, verdict)
  }
  for (const [key, detail] of copiedEnglish(englishByKey, translated, lang, kept))
    if (!verdicts.has(key)) verdicts.set(key, { klass: 'ENGLISH', detail })
  for (const key of everywhere)
    if (!verdicts.has(key) && !kept.has(key) && translated.get(key) === englishByKey.get(key))
      verdicts.set(key, {
        klass: 'ENGLISH',
        detail: `every language still holds the English ${JSON.stringify(englishByKey.get(key))}; translate it, or mark it "// keep-english: <reason>" in en.ts when it reads the same in every language (a product name)`,
      })
  return verdicts
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
 * @param [options] - None, or `root`: the checkout whose tables are read (a copy of an older tree).
 *   The default is this one.
 * @returns `{ problems, drifts, filesScanned, packagesScanned }` — `problems` are
 *   human-readable lines, `drifts` the structured records behind them.
 */
export function analyzeLocalePlaceholders({ root = ROOT } = {}) {
  const problems = []
  const drifts = []
  let filesScanned = 0
  let packagesScanned = 0

  for (const pkg of localePackages(root)) {
    packagesScanned += 1
    const src = join(pkg, 'src')
    const englishSource = readFileSync(join(src, 'en.ts'), 'utf8')
    const englishByKey = valuesByKey(englishSource)
    const { kept, problems: markerProblems } = keptInEnglish(englishSource)
    for (const problem of markerProblems)
      problems.push(`${pkg.slice(root.length + 1)}/src/en.ts: ${problem}`)
    const known = new Set()
    for (const value of englishByKey.values())
      for (const name of placeholders(value)) known.add(name)
    const label = pkg.slice(root.length + 1)
    const plurals = pluralBases(englishByKey)

    const files = readdirSync(src)
      .filter((file) => file.endsWith('.ts') && !SKIP.has(file))
      .sort()
      .map((file) => {
        const fileSource = readFileSync(join(src, file), 'utf8')
        return { file, fileSource, translated: valuesByKey(fileSource) }
      })
    const everywhere = new Set(
      untranslatedEverywhere(
        englishByKey,
        files
          .filter(({ file }) => writingScript(file.slice(0, -'.ts'.length)) !== undefined)
          .map(({ translated }) => translated),
        kept,
      ),
    )

    for (const { file, fileSource, translated } of files) {
      filesScanned += 1
      const where = `${label}/src/${file}`
      // A marker in the language file keeps its key English in that language only.
      const own = keptInEnglish(fileSource)
      for (const problem of own.problems) problems.push(`${where}: ${problem}`)
      const keptHere = new Map([...kept, ...own.kept])

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
        if (englishByKey.has(key)) continue
        // A key this bond's English does not define: every placeholder in it
        // is unresolvable, because only en.ts's call sites supply values.
        for (const name of placeholders(value)) {
          if (!known.has(name)) {
            problems.push(
              `${where}: '${key}' is not in en.ts and uses {{${name}}} — it renders literally`,
            )
          }
        }
      }

      const lang = file.slice(0, -'.ts'.length)
      for (const [key, verdict] of checkFile(
        englishByKey,
        translated,
        lang,
        keptHere,
        everywhere,
      )) {
        const englishValue = englishByKey.get(key)
        const value = translated.get(key)
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

const isMain = isMainModule(import.meta.url)

if (isMain) {
  const args = process.argv.slice(2)
  const namedRoot = args.find((arg) => arg.startsWith('--root='))?.slice('--root='.length)
  const root = namedRoot === undefined ? ROOT : resolve(namedRoot)
  const { problems, filesScanned, packagesScanned } = analyzeLocalePlaceholders({ root })
  if (!args.includes('--quiet')) {
    if (problems.length === 0) {
      console.log(
        `✓ locale placeholders intact (${filesScanned} file(s) across ${packagesScanned} bond(s))`,
      )
    } else {
      const shown = args.includes('--all') ? problems : problems.slice(0, 40)
      console.error(`\n✗ locale placeholder problems (${problems.length}):\n`)
      for (const problem of shown) console.error(`  ${problem}`)
      if (shown.length < problems.length)
        console.error(`  … and ${problems.length - shown.length} more`)
      console.error(
        `\nA placeholder name is a VARIABLE, not prose: it must match en.ts byte for byte\n` +
          `in every language, or the value never substitutes and the UI shows the raw token.\n` +
          `A KEPT value translates a key en.ts marks \`// keep-english: <reason>\`: restore the\n` +
          `English value (the translator below writes it).\n` +
          `A QUOTED value lost the quotes or brackets English writes around a token; a SPACING\n` +
          `value splits a token from its suffix. Both are retranslated by the command below.\n` +
          `An ENGLISH value is a key that was never translated (a short label counts in a\n` +
          `language not written in Latin script, or in a file still mostly English; a product\n` +
          `name is marked \`// keep-english: <reason>\` in en.ts). Translate the bond (in the\n` +
          `workspace: node scripts/translate-bond-gaps.mjs --apply --pkg=<bond>, which fills\n` +
          `missing keys and plural forms and retranslates every value this check refuses)\n` +
          `and write by hand any value it still refuses —\n` +
          `there is no baseline to add it to. See docs/locale-placeholder-drift.md.\n`,
      )
    }
  }
  process.exit(problems.length === 0 ? 0 : 1)
}
