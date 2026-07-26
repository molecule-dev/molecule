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
 * inside the braces must be byte-identical in all 79 languages.
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
 * Every `{{…}}` placeholder in a source file, with its raw inner text.
 *
 * Deliberately looser than the runtime regex (`\{\{\s*(\w+)\s*\}\}`): a
 * translated name like `{{ርዕስ}}` does not match `\w+` at all, so a check built on
 * the runtime pattern would not even SEE the worst cases.
 *
 * @param source - File contents.
 * @returns The placeholder names, in order, whitespace-trimmed.
 */
function placeholders(source) {
  return [...source.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map((match) => match[1])
}

/**
 * Locale bond directories that define an `en.ts`.
 *
 * @returns Absolute package directories.
 */
function localePackages() {
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

/** `  'some.key': 'the value',` → indent, key, separator, value. */
const LINE = /^(\s*)('(?:[^'\\]|\\.)*'|[A-Za-z_$][\w$]*)(\s*:\s*)(.*)$/

/**
 * Key → the value's text, handling prettier's wrapped form:
 *
 *     'someKey':
 *       'the long value',
 *
 * Reading only key-and-value-on-one-line skips exactly the longest strings,
 * which are the ones most likely to carry placeholders.
 *
 * @param source - File contents.
 * @returns Map of key → raw value text.
 */
function valuesByKey(source) {
  const lines = source.split('\n')
  const map = new Map()
  let pending = null
  for (const line of lines) {
    const parsed = LINE.exec(line)
    if (parsed) {
      const key = parsed[2].replace(/^'|'$/g, '')
      if (parsed[4].trim() === '') pending = key
      else {
        map.set(key, parsed[4])
        pending = null
      }
      continue
    }
    if (pending !== null && /^\s*['"`]/.test(line)) {
      map.set(pending, line)
      pending = null
    }
  }
  return map
}

const problems = []
let filesScanned = 0
let packagesScanned = 0

for (const pkg of localePackages()) {
  packagesScanned += 1
  const src = join(pkg, 'src')
  const english = readFileSync(join(src, 'en.ts'), 'utf8')
  const expected = new Set(placeholders(english))
  const englishByKey = valuesByKey(english)
  const label = pkg.slice(ROOT.length + 1)

  for (const file of readdirSync(src)) {
    if (!file.endsWith('.ts') || SKIP.has(file)) continue
    filesScanned += 1
    const source = readFileSync(join(src, file), 'utf8')
    const where = `${label}/src/${file}`

    // 1. A placeholder name this bond's English never defines. Renders literally.
    for (const name of new Set(placeholders(source))) {
      if (!expected.has(name)) {
        problems.push(
          `${where}: placeholder {{${name}}} is not one of en.ts's ` +
            `(${[...expected].map((n) => `{{${n}}}`).join(', ') || 'none'}) — it renders literally`,
        )
      }
    }

    // 2. Markup the translation tool was supposed to strip. `<x>` protected the
    //    placeholders it then translated anyway; it renders as visible text.
    if (/<\/?x>/.test(source)) {
      problems.push(`${where}: leaked <x> translation-tool markup`)
    }

    // 3. HTML entities — the same pipeline's earlier symptom, kept so a
    //    regression cannot land silently a second time.
    if (/&(?:#\d+|amp|quot|lt|gt|#x[0-9a-f]+);/i.test(source)) {
      problems.push(`${where}: HTML entity in translated text (see decode-locale-entities.js)`)
    }

    // 4. A DROPPED placeholder. The name check above cannot see this — a value
    //    that simply omits `{{time}}` introduces no unknown name, it just never
    //    shows the number. Measured: `'Elapsed {{time}}'` was translated to
    //    `'Möödunud aeg'`, so the elapsed time never rendered at all.
    const translated = valuesByKey(source)
    for (const [key, value] of translated) {
      const englishValue = englishByKey.get(key)
      if (englishValue === undefined) continue
      const want = placeholders(englishValue)
      const have = placeholders(value)
      if (want.length !== have.length) {
        problems.push(
          `${where}: '${key}' has ${have.length} placeholder(s) [${have.join(', ')}] but ` +
            `en.ts has ${want.length} [${want.join(', ')}] — the values cannot all render`,
        )
      }
    }

    // 5. A SINGLE-brace token where English has the same name doubled. The core
    //    documents that `{name}` is not interpolated and renders literally.
    for (const name of expected) {
      const single = new RegExp(`(?<!\\{)\\{\\s*${name}\\s*\\}(?!\\})`)
      if (single.test(source)) {
        problems.push(`${where}: {${name}} has single braces — only {{${name}}} interpolates`)
      }
    }
  }
}

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
        `in every language, or the value never substitutes and the UI shows the raw token.\n`,
    )
  }
}

process.exit(problems.length === 0 ? 0 : 1)
