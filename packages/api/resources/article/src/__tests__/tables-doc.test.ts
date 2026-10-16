/**
 * `@molecule/api-resource-article` owns TWO tables and reads two more, and the doc the executor
 * is served named only some of them: `articles` and `article_tags` are created by `articles.sql`
 * (plus the `position` column by `articles_position.sql`), while `reactions.sql` and `follows.sql`
 * copy `@molecule/api-resource-reaction`'s and `@molecule/api-resource-follow`'s own tables.
 * Nothing said how `article_tags` attaches to an article — the join key — which is the one column
 * a hand-written tag query gets wrong, so a tool that reads the join table itself has to be told
 * `article_tags.articleId` = `articles.id` (X0 flash-m84's class: the package's own reference
 * never named the second table of a two-table resource; see the user resource's equivalent test).
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

describe('the table contract in @molecule/api-resource-article’s own docs', () => {
  it('names both owned tables and the key that joins them', () => {
    const doc = moduleDoc(read('src/index.ts'))
    expect(doc).toContain('`articles`')
    expect(doc).toContain('`article_tags`')
    expect(doc).toContain('article_tags.articleId')
    expect(doc).toContain('articles.id')
  })

  it('carries it into the generated README, the doc read_molecule_doc serves', () => {
    const readme = read('README.md')
    expect(readme).toContain('article_tags.articleId')
    expect(readme).toContain('articles.id')
  })
})
