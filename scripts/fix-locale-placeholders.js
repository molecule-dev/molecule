#!/usr/bin/env node
/* global console, process */
/**
 * Restore translated interpolation placeholder names to their `en.ts` originals
 * and strip leaked `<x>` translation-tool markup.
 *
 * Matching is PER KEY and POSITIONAL: for each key, the English value's ordered
 * placeholder list is the authority, and the translated value's Nth placeholder
 * becomes the English Nth. When the counts differ the line is REPORTED and left
 * alone — a translation that dropped or invented a placeholder is a content
 * problem, not something positional matching can honestly repair.
 *
 * Only the text INSIDE `{{…}}` and literal `<x>`/`</x>` substrings are touched.
 * Nothing re-serializes a value, because 1,152 lines carry `\u` escapes and a
 * previous bulk locale edit corrupted ~165 cells by round-tripping them.
 *
 * DRY RUN by default. Pass --apply to write.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = '/home/l/Repos/molecule-workspace/molecule'
const DIRS = [join(ROOT, 'packages/app/locales'), join(ROOT, 'packages/api/locales')]
const SKIP = new Set(['en.ts', 'index.ts', 'types.ts'])
const apply = process.argv.includes('--apply')

/** `  'some.key': 'the value',` → indent, key, separator, value segment. */
const LINE = /^(\s*)('(?:[^'\\]|\\.)*'|[A-Za-z_$][\w$]*)(\s*:\s*)(.*)$/

/** Ordered placeholder names in a value. */
/** Ordered placeholder names in a value. */
const placeholders = (text) => [...text.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map((m) => m[1])

/**
 * Pair every key with the line its VALUE lives on.
 *
 * Prettier wraps a long value onto its own line:
 *
 *     'someKey':
 *       'the long value',
 *
 * so a key-and-value-on-one-line regex silently skips exactly the longest
 * strings — which are the ones most likely to carry placeholders. The first
 * version of this script did that and missed 346 files; the audit caught it
 * because it scans file text rather than lines.
 *
 * @param lines - The file's lines.
 * @returns Map of line index → key whose value that line holds.
 */
/**
 * Pair every key with the line its VALUE lives on.
 *
 * @param lines - The file lines.
 * @returns Line index → the key whose value that line holds.
 */
function valueLines(lines) {
  const owner = new Map()
  let pendingKey = null
  for (const [index, line] of lines.entries()) {
    const parsed = LINE.exec(line)
    if (parsed) {
      const key = parsed[2].replace(/^'|'$/g, '')
      if (parsed[4].trim() === '') {
        pendingKey = key // value is on a following line
      } else {
        owner.set(index, key)
        pendingKey = null
      }
      continue
    }
    if (pendingKey !== null && /^\s*['"`]/.test(line)) {
      owner.set(index, pendingKey)
      pendingKey = null
    }
  }
  return owner
}

/** Key → ordered English placeholder names, for one bond. */
/**
 * Read the English placeholder names for every key.
 *
 * @param enSource - The en.ts contents.
 * @returns Key → ordered placeholder names.
 */
function englishPlaceholders(enSource) {
  const lines = enSource.split('\n')
  const owner = valueLines(lines)
  const map = new Map()
  for (const [index, key] of owner) {
    const parsed = LINE.exec(lines[index])
    const value = parsed ? parsed[4] : lines[index]
    // A key may already be present when its value spans a wrap; keep the union.
    map.set(key, [...(map.get(key) ?? []), ...placeholders(value)])
  }
  return map
}

let filesChanged = 0
let namesFixed = 0
let tagsStripped = 0
const unfixable = []
const samples = []

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
    const expected = englishPlaceholders(english)

    for (const file of readdirSync(src)) {
      if (!file.endsWith('.ts') || SKIP.has(file)) continue
      const path = join(src, file)
      const original = readFileSync(path, 'utf8')
      let changedHere = false

      const lines = original.split('\n')
      const owner = valueLines(lines)

      const next = lines
        .map((line, lineIndex) => {
          const key = owner.get(lineIndex)
          if (key === undefined) return line
          // A wrapped value has no `key:` prefix — the whole line IS the value.
          const parsed = LINE.exec(line)
          const indent = parsed ? parsed[1] : ''
          const rawKey = parsed ? parsed[2] : ''
          const sep = parsed ? parsed[3] : ''
          const rawValue = parsed ? parsed[4] : line
          let value = rawValue

          // 1. Strip the translation tool's own protection markup.
          if (/<\/?x>/.test(value)) {
            value = value.replace(/<\/?x>/g, '')
            tagsStripped += 1
            changedHere = true
          }

          // 2. Restore placeholder NAMES positionally against English.
          const want = expected.get(key)
          const have = placeholders(value)
          if (want && have.length > 0) {
            if (want.length !== have.length) {
              unfixable.push(
                `${dir.slice(ROOT.length + 1)}/src/${file}: '${key}' has ${have.length} ` +
                  `placeholder(s) [${have.join(', ')}] but en.ts has ${want.length} [${want.join(', ')}]`,
              )
            } else if (want.some((w, i) => w !== have[i])) {
              let index = 0
              const before = value
              value = value.replace(/\{\{\s*[^}]*?\s*\}\}/g, () => `{{${want[index++]}}}`)
              namesFixed += want.filter((w, i) => w !== have[i]).length
              changedHere = true
              if (samples.length < 5) {
                samples.push(
                  `${name}/${file}  ${before.trim().slice(0, 70)}\n` +
                    `${' '.repeat(name.length + file.length + 3)}→ ${value.trim().slice(0, 70)}`,
                )
              }
            }
          }

          return parsed ? `${indent}${rawKey}${sep}${value}` : value
        })
        .join('\n')

      if (changedHere) {
        filesChanged += 1
        if (apply) writeFileSync(path, next)
      }
    }
  }
}

console.log(`files changed          : ${filesChanged}`)
console.log(`placeholder names fixed: ${namesFixed}`)
console.log(`<x> tags stripped from : ${tagsStripped} value(s)`)
console.log(`UNFIXABLE (count mismatch, left alone): ${unfixable.length}`)
for (const problem of unfixable.slice(0, 15)) console.log(`  ${problem}`)
if (unfixable.length > 15) console.log(`  … and ${unfixable.length - 15} more`)

if (!apply) {
  console.log('\n--- sample rewrites ---')
  for (const sample of samples) console.log(`  ${sample}`)
  console.log('\nDRY RUN — pass --apply to write.')
}
