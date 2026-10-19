/**
 * The numbering contract on the surface the executor reads.
 *
 * X0 m207: a model imported `commentNumbers` but created with an unnumbered
 * `createComment`, rendered `numbers.get(id) ?? 0`, and every comment came back
 * with id `0` — a wrong answer the docs never contradicted. The fix lives where
 * the executor looks: `createComment` numbers by default, and the JSDoc (and the
 * README generated from it) says plainly that a comment is addressed by its
 * `number`, looked up with `getCommentByNumber`, and that a missing map entry is
 * never `0`. This test keeps that wording on the shipped surface.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const PACKAGE = join(__dirname, '../..')

/** A file of the package, read as text. */
const read = (file: string): string => readFileSync(join(PACKAGE, file), 'utf8')

describe('the numbering contract in @molecule/api-resource-comment’s own docs', () => {
  it('createComment’s JSDoc says it numbers the comment and names getCommentByNumber', () => {
    const source = read('src/service.ts')
    const start = source.indexOf('Creates a new comment on a resource, with its sequential number.')
    expect(start).toBeGreaterThan(-1)
    const doc = source.slice(start, source.indexOf('export async function createComment'))
    expect(doc).toContain('getCommentByNumber')
    expect(doc).toContain('number')
  })

  it('commentNumbers’ JSDoc warns that a missing entry is not `0`', () => {
    const source = read('src/numbers.ts')
    const start = source.indexOf('The numbers of the given comments')
    const doc = source.slice(start, source.indexOf('export async function commentNumbers'))
    expect(doc).toContain('Never read a missing entry as')
    expect(doc).toContain('`0` is not a comment id')
  })

  it('carries both into the generated README, the doc read_molecule_doc serves', () => {
    const readme = read('README.md')
    expect(readme).toContain('Creates a new comment on a resource, with its sequential number.')
    expect(readme).toContain('getCommentByNumber(number)')
    expect(readme).toContain('`0` is not a comment id')
  })
})
