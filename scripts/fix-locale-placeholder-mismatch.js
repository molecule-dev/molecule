#!/usr/bin/env node
/* global console, process */
/**
 * Fall back to English for translated values whose placeholder COUNT does not
 * match `en.ts`.
 *
 * These cannot be repaired positionally, because the translation lost or invented
 * information rather than renaming it:
 *
 *   en: 'Elapsed {{time}}'        et: 'Möödunud aeg'          ← value never shows
 *   en: 'Failed to read {{path}}' cy: 'Methwyd darllen llwybr' ← "path" translated to prose
 *   en: '{{hours}}h {{minutes}}m' id: '{{jam}} H menit M'      ← minutes became a word
 *   en: 'All'                     af: 'All ({{count}})'        ← stray placeholder
 *
 * Restoring a placeholder into translated prose is real translation work — it
 * needs grammar and word order, not string surgery — so this writes the ENGLISH
 * value, which is what an i18n layer falls back to anyway, and records each one
 * as reviewable debt. A correct English string beats a broken localized one.
 *
 * DRY RUN by default. Pass --apply to write.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = '/home/l/Repos/molecule-workspace/molecule'
const DIRS = [join(ROOT, 'packages/app/locales'), join(ROOT, 'packages/api/locales')]
const SKIP = new Set(['en.ts', 'index.ts', 'types.ts'])
const apply = process.argv.includes('--apply')

const LINE = /^(\s*)('(?:[^'\\]|\\.)*'|[A-Za-z_$][\w$]*)(\s*:\s*)(.*)$/
/** Ordered placeholder names in a value. */
const placeholders = (text) => [...text.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map((m) => m[1])

/** Map of line index → the key whose value that line holds (handles wrapped values). */
/**
 * Pair every key with the line its VALUE lives on.
 *
 * @param lines - The file lines.
 * @returns Line index → the key whose value that line holds.
 */
function valueLines(lines) {
  const owner = new Map()
  let pending = null
  for (const [index, line] of lines.entries()) {
    const parsed = LINE.exec(line)
    if (parsed) {
      const key = parsed[2].replace(/^'|'$/g, '')
      if (parsed[4].trim() === '') pending = key
      else {
        owner.set(index, key)
        pending = null
      }
      continue
    }
    if (pending !== null && /^\s*['"`]/.test(line)) {
      owner.set(index, pending)
      pending = null
    }
  }
  return owner
}

/** Key → the raw value segment, exactly as written. */
/**
 * Read every key and the raw text of its value.
 *
 * @param source - File contents.
 * @returns Key → raw value text.
 */
function values(source) {
  const lines = source.split('\n')
  const map = new Map()
  for (const [index, key] of valueLines(lines)) {
    const parsed = LINE.exec(lines[index])
    map.set(key, (parsed ? parsed[4] : lines[index]).trim())
  }
  return map
}

const changes = []

for (const base of DIRS) {
  let entries
  try {
    entries = readdirSync(base)
  } catch (_error) {
    // Intentional noop: a directory without this shape is simply not a
    // locale bond — skipping it is the correct read, not a swallowed failure.
    continue
  }
  for (const name of entries) {
    const dir = join(base, name)
    if (!statSync(dir).isDirectory()) continue
    const src = join(dir, 'src')
    let english
    try {
      english = readFileSync(join(src, 'en.ts'), 'utf8')
    } catch (_error) {
      // Intentional noop: a directory without this shape is simply not a
      // locale bond — skipping it is the correct read, not a swallowed failure.
      continue
    }
    const englishValues = values(english)

    for (const file of readdirSync(src)) {
      if (!file.endsWith('.ts') || SKIP.has(file)) continue
      const path = join(src, file)
      const lines = readFileSync(path, 'utf8').split('\n')
      const owner = valueLines(lines)
      let changed = false

      const next = lines.map((line, index) => {
        const key = owner.get(index)
        if (key === undefined) return line
        const englishValue = englishValues.get(key)
        if (englishValue === undefined) return line

        const parsed = LINE.exec(line)
        const rawValue = (parsed ? parsed[4] : line).trim()
        if (placeholders(englishValue).length === placeholders(rawValue).length) return line

        changed = true
        changes.push({
          where: `${dir.slice(ROOT.length + 1)}/src/${file}`,
          key,
          from: rawValue,
          to: englishValue,
        })
        return parsed ? `${parsed[1]}${parsed[2]}${parsed[3]}${englishValue}` : `  ${englishValue}`
      })

      if (changed && apply) writeFileSync(path, next.join('\n'))
    }
  }
}

console.log(`values reset to English: ${changes.length}`)
for (const change of changes.slice(0, 12)) {
  console.log(`  ${change.where}  '${change.key}'`)
  console.log(`     was: ${change.from}`)
  console.log(`     now: ${change.to}`)
}
if (changes.length > 12) console.log(`  … and ${changes.length - 12} more`)

if (apply) {
  // The discarded text is real translation work, broken only by a lost
  // placeholder. Recording it means a translator can repair the string properly
  // — restoring the variable with correct grammar and word order — instead of
  // re-translating from scratch. Same precedent as i18n-parity-baseline.json.
  const debtPath = join(ROOT, 'scripts', 'locale-placeholder-debt.json')
  writeFileSync(
    debtPath,
    `${JSON.stringify(
      {
        note:
          'Translations reset to English because their placeholder count did not match en.ts — ' +
          'the dynamic value would never have rendered. `was` is the original text, kept so a ' +
          'translator can restore the placeholder with correct grammar rather than re-translate.',
        generatedBy: 'scripts/fix-locale-placeholder-mismatch.js',
        entries: changes,
      },
      null,
      2,
    )}\n`,
  )
  console.log(`\nrecorded ${changes.length} entries in scripts/locale-placeholder-debt.json`)
} else {
  console.log('\nDRY RUN — pass --apply to write.')
}
