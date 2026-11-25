#!/usr/bin/env node
/**
 * Refuse a `no-intrinsic-jsx` exemption or tag table that no longer matches the tree.
 *
 * `no-intrinsic-jsx` holds the React features and the React UI kit's components to the
 * renderer-neutral elements. Two of its inputs drift from the source they describe:
 *
 * - `eslint-rules/intrinsic-jsx-pending.json` exempts the packages not converted yet. An entry left
 *   after its package is converted keeps exempting it, so raw DOM tags can come back with no lint
 *   error (the avatar-stack and margin-notes conversions both landed that way on 2026-11-25).
 * - The rule's tag table names the element for each tag. An element type that gains a tag without a
 *   table entry makes the rule tell authors to add an element that already exists (`Disclosure`,
 *   `Rule` and `Box as="address"` were added that way on 2026-11-25).
 *
 * A scripts test checked both, but molecule CI runs its tests after every build check, so a failing
 * build check hid them. The pre-commit hook runs this from an export of the index, so it judges what
 * the commit carries, not another session's uncommitted conversion.
 *
 *   node scripts/check-intrinsic-jsx.mjs         # exit 1 naming each gap
 *   node scripts/check-intrinsic-jsx.mjs --fix   # delete the stale pending entries
 */
import console from 'node:console'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  elementTagGaps,
  pendingWithIntrinsicJsx,
  prunedPending,
} from '../eslint-rules/intrinsic-jsx-config.mjs'
import { isMainModule } from './lib/is-main.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PENDING = join(ROOT, 'eslint-rules', 'intrinsic-jsx-pending.json')

/**
 * Every pending entry whose package or component no longer renders an intrinsic JSX element.
 *
 * @param root - The molecule root.
 * @returns One line per stale entry, naming the entry and its list.
 */
export function staleIntrinsicJsxEntries(root) {
  const still = pendingWithIntrinsicJsx(root)
  return [
    ...Object.entries(still.features)
      .filter(([, renders]) => !renders)
      .map(([feature]) => `packages/app/features/${feature}: "${feature}" in "features"`),
    ...Object.entries(still.kitComponents)
      .filter(([, renders]) => !renders)
      .map(
        ([file]) =>
          `packages/app/frameworks/react-ui/src/components/${file}: "${file}" in "kitComponents"`,
      ),
  ]
}

if (isMainModule(import.meta.url)) {
  const stale = staleIntrinsicJsxEntries(ROOT)
  const { unmapped, refused, takesAs } = elementTagGaps(ROOT)
  if (process.argv.includes('--fix')) {
    const text = readFileSync(PENDING, 'utf8')
    const pruned = `${JSON.stringify(prunedPending(ROOT), null, 2)}\n`
    if (pruned !== text) writeFileSync(PENDING, pruned)
    for (const line of stale) console.log(`deleted ${line}`)
  } else {
    for (const line of stale) console.log(`✗ ${line} no longer renders an intrinsic JSX element`)
  }
  const tableGaps = [...unmapped, ...refused, ...takesAs]
  for (const line of tableGaps) console.log(`✗ ${line}`)
  const remaining = (process.argv.includes('--fix') ? 0 : stale.length) + tableGaps.length
  if (remaining) {
    if (stale.length && !process.argv.includes('--fix'))
      console.log(
        `\n${stale.length} stale entr${stale.length === 1 ? 'y' : 'ies'} in eslint-rules/intrinsic-jsx-pending.json keep converted code exempt from no-intrinsic-jsx. \`node scripts/check-intrinsic-jsx.mjs --fix\` deletes them.`,
      )
    if (tableGaps.length)
      console.log(
        `\n${tableGaps.length} gap(s) between the tag table in eslint-rules/no-intrinsic-jsx.mjs and packages/app/core/ui/src/elements.ts; edit the table as each line says.`,
      )
    process.exit(1)
  }
  console.log(
    'Every intrinsic-jsx-pending entry still renders an intrinsic JSX element, and the tag table matches the element types.',
  )
}
