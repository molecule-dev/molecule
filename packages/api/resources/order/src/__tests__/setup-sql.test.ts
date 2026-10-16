/**
 * The two setup files that declare `order_items` must agree: `orders.sql` is
 * the definition a fresh database gets, and `orders_position.sql` states the
 * same table (it is the file a database that has neither gets) before adding the
 * `position` column to a table that predates it.
 *
 * The column name matters at runtime — a reader of the table orders by
 * `position` — so the upgrade statement must be present, idempotent, and target
 * the column the table declares.
 */
import { readdirSync, readFileSync } from 'node:fs'
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

describe('order_items setup SQL', () => {
  it('declares the same columns in orders.sql and orders_position.sql', () => {
    const created = columnsOf(file('orders.sql'), 'order_items')
    expect(created).toContain('position')
    expect(columnsOf(file('orders_position.sql'), 'order_items')).toEqual(created)
  })

  it('adds position idempotently, so a database that applied orders.sql is upgraded', () => {
    expect(file('orders_position.sql')).toMatch(
      /ALTER\s+TABLE\s+"order_items"\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+"position"\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+0\s*;/i,
    )
  })

  it('is ordered after orders.sql, so a fresh scaffold creates the table first', () => {
    // The scaffold copies a package's setup files into ONE directory and the
    // migrator replays them in lexical order. `orders_position.sql` sorting
    // first would still work (it declares the whole table) — but only by
    // accident, and the file reads as an upgrade, not a definition.
    const names = readdirSync(setupDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
    expect(names.indexOf('orders.sql')).toBeLessThan(names.indexOf('orders_position.sql'))
  })
})
