/**
 * `@molecule/api-resource-comment` owns TWO tables — `comments` and `comment_numbers` — and the
 * doc the executor is served mentioned `comment_numbers.sql` without ever saying how the two
 * relate, which is the whole question for a caller that has a number and needs the comment (or
 * the reverse). The join key is `comment_numbers.commentId` = `comments.id`, and a package's own
 * reference is where that belongs (X0 flash-m84's class: the package's own reference never named
 * the second table of a two-table resource, or the column that joins them; see the user
 * resource's equivalent test).
 *
 * The contract lives on the surface the executor reads — the README, generated from the module
 * JSDoc — so the check is on the JSDoc AND on the generated doc.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const PACKAGE = join(__dirname, '../..')

/** A file of the package, read as text. */
const read = (file: string): string => readFileSync(join(PACKAGE, file), 'utf8')

/** The module JSDoc — everything between the file's first opening block and its close. */
function moduleDoc(source: string): string {
  return source.slice(source.indexOf('/**'), source.indexOf('*/'))
}

describe('the table contract in @molecule/api-resource-comment’s own docs', () => {
  it('names both owned tables and the key that joins them', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('`comments`')
    expect(doc).toContain('`comment_numbers`')
    expect(doc).toContain('comment_numbers.commentId')
    expect(doc).toContain('comments.id')
  })

  it('carries it into the generated README, the doc read_molecule_doc serves', () => {
    const readme = read('README.md')
    expect(readme).toContain('comment_numbers.commentId')
    expect(readme).toContain('comments.id')
  })
})
