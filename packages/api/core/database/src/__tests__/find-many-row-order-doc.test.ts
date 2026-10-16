/**
 * The `findMany` row-order contract is a DOCUMENTED one, and this is the test
 * that keeps it documented.
 *
 * The change this guards had no runtime behavior to assert: the bonds already
 * emit no `ORDER BY` when the caller passes none, so "a `where` on an indexed
 * column returns index order" is the database doing its job. What was missing
 * was the contract, and the contract is what the caller needs — an executor
 * reading `@molecule/api-database` through `read_molecule_doc` (which serves the
 * GENERATED README) has only this text to go on, and without it a list whose
 * order matters gets built on `findMany` with no `orderBy` and reads the wrong
 * first row.
 *
 * So: the rule must be in the source (the source of truth the next regen reads)
 * AND in the generated README (the surface the doc tool serves). Both, because
 * a rule that only exists in one of them is the drift this asserts against.
 *
 * @module
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const source = (file: string): string => readFileSync(join(packageRoot, 'src', file), 'utf-8')
const readme = (): string => readFileSync(join(packageRoot, 'README.md'), 'utf-8')

/** The one sentence a caller must be able to find, wherever they enter the docs. */
const CONTRACT = /Row order is unspecified unless `orderBy` is given\./

describe('findMany row-order contract', () => {
  it('is stated on DataStore.findMany in the source', () => {
    expect(source('store.ts')).toMatch(CONTRACT)
  })

  it('is stated on the exported findMany function in the source', () => {
    expect(source('store-provider.ts')).toMatch(
      /The order of the rows is unspecified unless `options\.orderBy` is given\./,
    )
  })

  it('names the mechanism — an indexed `where` returns index order, not insertion order', () => {
    const text = source('store.ts')
    expect(text).toMatch(/a `where` on an INDEXED column/)
    expect(text).toMatch(/Never assume the order rows were inserted in/)
  })

  it('says how to pass one', () => {
    expect(source('store.ts')).toMatch(/`orderBy: \[\{ field: 'createdAt', direction: 'desc' \}\]`/)
  })

  it('says what to do when no column encodes the order — store a position', () => {
    expect(source('store.ts')).toMatch(/store one — a `position` integer/)
  })

  it('reaches read_molecule_doc: the generated README carries the contract', () => {
    const doc = readme()
    expect(doc).toMatch(CONTRACT)
    expect(doc).toMatch(/The order of the rows is unspecified unless `options\.orderBy` is given\./)
    expect(doc).toMatch(/`orderBy: \[\{ field: 'createdAt', direction: 'desc' \}\]`/)
  })
})
