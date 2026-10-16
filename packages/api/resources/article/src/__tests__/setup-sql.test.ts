/**
 * The two setup files that declare `article_tags` must agree: `articles.sql` is
 * the definition a fresh database gets, and `articles_position.sql` states the
 * same table (it is the file a database that has neither gets) before adding the
 * `position` column to a table that predates it.
 *
 * The column name matters at runtime — a reader of the join table orders by
 * `position` — so the upgrade statement must be present, idempotent, and target
 * the column the table declares.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const setupDir = new URL('../__setup__/', import.meta.url).pathname

const file = (name: string): string => readFileSync(join(setupDir, name), 'utf-8')

/** The column names `sql` declares for `table`, in declaration order. */
const columnsOf = (sql: string, table: string): string[] => {
  const head = new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+"${table}"\\s*\\(`, 'i').exec(
    sql,
  )
  if (!head) return []
  let depth = 1
  let i = head.index + head[0].length
  const start = i
  for (; i < sql.length && depth > 0; i++) {
    if (sql[i] === '(') depth++
    else if (sql[i] === ')') depth--
  }
  const body = sql
    .slice(start, i - 1)
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
  const parts: string[] = []
  let level = 0
  let current = ''
  for (const ch of body) {
    if (ch === '(') level++
    if (ch === ')') level--
    if (ch === ',' && level === 0) {
      parts.push(current)
      current = ''
    } else current += ch
  }
  parts.push(current)
  return parts
    .map((p) => p.trim())
    .filter((p) => p && !/^(CONSTRAINT|PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK)\b/i.test(p))
    .map((p) => /^"([^"]+)"/.exec(p)?.[1] ?? '')
    .filter(Boolean)
}

describe('article_tags setup SQL', () => {
  it('declares the same columns in articles.sql and articles_position.sql', () => {
    const created = columnsOf(file('articles.sql'), 'article_tags')
    expect(created).toContain('position')
    expect(columnsOf(file('articles_position.sql'), 'article_tags')).toEqual(created)
  })

  it('adds position idempotently, so a database that applied articles.sql is upgraded', () => {
    expect(file('articles_position.sql')).toMatch(
      /ALTER\s+TABLE\s+"article_tags"\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+"position"\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0\s*;/i,
    )
  })
})
