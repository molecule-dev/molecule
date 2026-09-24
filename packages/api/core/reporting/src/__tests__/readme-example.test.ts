/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — the database reporting bond over the
 * SQLite pool on a real database file in a temp dir (no mocks).
 *
 * @module
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { query, setPool } from '@molecule/api-database'
import { createMigrator, pool } from '@molecule/api-database-sqlite'
import { createProvider } from '@molecule/api-reporting-database'

import type { AggregateQuery } from '../index.js'
import { aggregate, exportReport, setProvider } from '../index.js'

describe('README @example', () => {
  const originalCwd = process.cwd()
  const originalPath = process.env.SQLITE_PATH
  let root = ''

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'reporting-readme-'))
    await mkdir(join(root, 'migrations'))
    await writeFile(
      join(root, 'migrations/001_orders.sql'),
      `CREATE TABLE IF NOT EXISTS "orders" (
        "id" text PRIMARY KEY,
        "user_id" text NOT NULL,
        "status" text NOT NULL,
        "total_cents" integer NOT NULL
      );`,
    )
    process.chdir(root)
    process.env.SQLITE_PATH = join(root, 'data/app.db')
  })

  afterAll(async () => {
    await pool.end()
    process.chdir(originalCwd)
    if (originalPath === undefined) delete process.env.SQLITE_PATH
    else process.env.SQLITE_PATH = originalPath
    vi.restoreAllMocks()
    await rm(root, { recursive: true, force: true })
  })

  it('aggregates owner-scoped revenue per status and exports it as CSV', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await createMigrator(join(process.cwd(), 'migrations'))()
    setPool(pool)
    setProvider(createProvider({ maxRows: 1000 }))

    const seed: [string, string, string, number][] = [
      ['o1', 'user-123', 'paid', 2000],
      ['o2', 'user-123', 'paid', 3000],
      ['o3', 'user-123', 'refunded', 1500],
      ['o4', 'user-999', 'paid', 99999],
    ]
    for (const row of seed) {
      await query(
        'INSERT INTO "orders" ("id", "user_id", "status", "total_cents") VALUES ($1, $2, $3, $4)',
        row,
      )
    }

    const userId = 'user-123'
    const revenueByStatus: AggregateQuery = {
      table: 'orders',
      measures: [
        { field: 'id', function: 'count', alias: 'orders' },
        { field: 'total_cents', function: 'sum', alias: 'revenue_cents' },
      ],
      dimensions: ['status'],
      filters: [{ field: 'user_id', operator: 'eq', value: userId }],
      orderBy: [{ field: 'revenue_cents', direction: 'desc' }],
    }

    const { rows, total } = await aggregate(revenueByStatus)
    expect(total).toBe(2)
    expect(rows.map((row) => [row.status, Number(row.orders), Number(row.revenue_cents)])).toEqual([
      ['paid', 2, 5000],
      ['refunded', 1, 1500],
    ])

    const csv = await exportReport(revenueByStatus, 'csv')
    const lines = csv.toString('utf8').trim().split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('paid')
    expect(csv.toString('utf8')).not.toContain('99999')
  })
})
