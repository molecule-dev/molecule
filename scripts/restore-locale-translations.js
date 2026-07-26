#!/usr/bin/env node
/* global console, process, URL */

/**
 * Put back the 558 translations that were overwritten with English.
 *
 * `fix-locale-placeholder-mismatch.js` replaced any value whose placeholder
 * COUNT disagreed with `en.ts` — reasoning that a translation which can never
 * render its value is worse than correct English. That reasoning was wrong twice
 * over:
 *
 * 1. **It was unnecessary.** `@molecule/app-i18n`'s provider already falls back
 *    to English for a missing or unusable key (`provider.ts:163`, `:187`). The
 *    fallback did not need to be written into the file; writing it in only
 *    destroyed the translation.
 * 2. **It threw away real work.** 277 of the 558 were genuine translations —
 *    `'Tühi pesa, {{nädalapäev}} aeg'` became `'Empty slot, {{weekday}} {{time}}'`.
 *    A dropped placeholder is a defect to record, not a licence to delete the
 *    language.
 *
 * This restores every original from `locale-placeholder-debt.json`, which is why
 * that file was written before the overwrite. The dropped-placeholder debt goes
 * back to being what it always was: pre-existing, recorded, and a translator's
 * job — not something to paper over by shipping English.
 *
 * DRY RUN by default. Pass --apply to write.
 *
 * @module
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const DEBT = join(ROOT, 'scripts', 'locale-placeholder-debt.json')
const apply = process.argv.includes('--apply')

const { entries } = JSON.parse(readFileSync(DEBT, 'utf8'))

let restored = 0
const missing = []
const byFile = new Map()
for (const entry of entries) {
  if (!byFile.has(entry.where)) byFile.set(entry.where, [])
  byFile.get(entry.where).push(entry)
}

for (const [where, fileEntries] of byFile) {
  const path = join(ROOT, where)
  const lines = readFileSync(path, 'utf8').split('\n')
  let changed = false

  for (const entry of fileEntries) {
    // Match the key's line and swap the English value back for the original.
    const keyPattern = new RegExp(
      `^(\\s*)('${entry.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\s*:\\s*)`,
    )
    let found = false
    for (const [index, line] of lines.entries()) {
      const parsed = keyPattern.exec(line)
      if (!parsed) continue
      const rest = line.slice(parsed[0].length)
      if (rest.trim() === '') {
        // Prettier wrapped the value onto the next line.
        const next = index + 1
        if (lines[next] !== undefined && lines[next].trim() === entry.to.trim()) {
          lines[next] = lines[next].replace(entry.to.trim(), entry.from.trim())
          found = true
        }
      } else if (rest.trim() === entry.to.trim()) {
        lines[index] = `${parsed[0]}${entry.from.trim()}`
        found = true
      }
      if (found) break
    }
    if (found) {
      restored += 1
      changed = true
    } else {
      missing.push(`${where}  '${entry.key}'`)
    }
  }

  if (changed && apply) writeFileSync(path, lines.join('\n'))
}

console.log(`translations restored: ${restored} of ${entries.length}`)
if (missing.length > 0) {
  console.log(`NOT FOUND (left as-is): ${missing.length}`)
  for (const item of missing.slice(0, 10)) console.log(`  ${item}`)
}
if (!apply) console.log('\nDRY RUN — pass --apply to write.')
