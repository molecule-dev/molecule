/**
 * The raw-`query()` RESULT SHAPE is a DOCUMENTED contract, and this is the test
 * that keeps it documented.
 *
 * X1 flash-m77 wrote five handlers of hand-rolled SQL, then read its own result
 * as if the database bond were better-sqlite3: `TypeError: result.get is not a
 * function` (+09:36), found by a probe script and a README slice six calls later.
 * `query()` resolves to a plain `{ rows, rowCount }` — nothing about that object
 * exists on a driver's `Database#prepare()` — but the docs named it only as the
 * `@returns` line of an export, which renders into the README body, and never as
 * one of the negative gotchas the module's `@remarks` collects.
 *
 * So: the rule must be in the source (what the next regen reads) AND in the
 * generated README (the surface `read_molecule_doc` serves). Both, because a rule
 * that only exists in one of them is the drift this asserts against — the same
 * shape as `find-many-row-order-doc.test.ts`.
 *
 * @module
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** The file's text with the JSDoc line prefixes removed, so a sentence can span lines. */
const unwrapped = (text: string): string => text.replace(/^\s*\*\s?/gm, '')

const source = (file: string): string =>
  unwrapped(readFileSync(join(packageRoot, 'src', file), 'utf-8'))
const readme = (): string => readFileSync(join(packageRoot, 'README.md'), 'utf-8')

/** The one sentence a caller must be able to find, wherever they enter the docs. */
const CONTRACT = /`TypeError: result\.get is not a function` is\s+that mistake/

describe('the raw query() result shape', () => {
  it('is stated as a gotcha in the module’s remarks', () => {
    expect(source('index.ts')).toMatch(CONTRACT)
    expect(source('index.ts')).toMatch(/no `\.get\(\)`, `\.all\(\)` or `\.run\(\)` on it either/)
    expect(source('index.ts')).toMatch(/`\{ rows, rowCount, fields\? \}`/)
  })

  it('says where the rows are, and what rowCount is for', () => {
    const text = source('index.ts')
    expect(text).toMatch(/\(await query\(sql, values\)\)\.rows/)
    expect(text).toMatch(/`rowCount` for how many rows an\s+INSERT\/UPDATE\/DELETE changed/)
    expect(text).toMatch(/a "fetch one row" is `rows\[0\]`/)
  })

  it('is stated on the exported query() itself', () => {
    expect(source('provider.ts')).toMatch(/no `\.get\(\)`, `\.all\(\)` or `\.run\(\)` on it/)
  })

  it('reaches read_molecule_doc: the generated README carries both', () => {
    const doc = readme()
    expect(doc).toMatch(CONTRACT)
    expect(doc).toMatch(/no `\.get\(\)`, `\.all\(\)` or `\.run\(\)` on it either/)
  })
})
