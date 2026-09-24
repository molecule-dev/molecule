/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real reporting and
 * database cores. Only the PostgreSQL database bond module is replaced — by a
 * pool that answers the SQL this bond generates with canned node-postgres-shaped
 * rows (numeric aggregates as strings, `date_trunc` buckets as `Date`s).
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { setPool } from '@molecule/api-database'
import { pool } from '@molecule/api-database-postgresql'
import type { AggregateQuery } from '@molecule/api-reporting'
import { aggregate, exportReport, setProvider, timeSeries } from '@molecule/api-reporting'

import { createProvider } from '../index.js'

const db = vi.hoisted(() => {
  const statements: Array<{ sql: string; params: unknown[] | undefined }> = []
  const query = vi.fn(async (sql: string, params?: unknown[]) => {
    statements.push({ sql, params })
    if (sql.startsWith('SELECT COUNT(*) AS "total"')) return { rows: [{ total: '3' }], rowCount: 1 }
    if (sql.includes('date_trunc')) {
      return {
        rows: [
          { date: new Date('2026-09-01T00:00:00Z'), revenue: '310.00' },
          { date: new Date('2026-09-02T00:00:00Z'), revenue: '95.50' },
        ],
        rowCount: 2,
      }
    }
    return {
      rows: [
        { status: 'paid', revenue: '1250.00', orders: '12' },
        { status: 'refunded', revenue: '80.00', orders: '1' },
      ],
      rowCount: 2,
    }
  })
  return { statements, pool: { query, connect: vi.fn(), end: vi.fn() } }
})

vi.mock('@molecule/api-database-postgresql', () => ({ pool: db.pool }))

describe('README @example', () => {
  it('runs parameterized aggregate and time-series SQL and exports CSV', async () => {
    setPool(pool)
    setProvider(createProvider({ maxRows: 5000 }))

    const byStatus: AggregateQuery = {
      table: 'orders',
      measures: [
        { field: 'total', function: 'sum', alias: 'revenue' },
        { field: 'id', function: 'count', alias: 'orders' },
      ],
      dimensions: ['status'],
      filters: [{ field: 'created_at', operator: 'gte', value: new Date('2026-01-01T00:00:00Z') }],
      orderBy: [{ field: 'revenue', direction: 'desc' }],
      limit: 10,
    }
    const { rows, total } = await aggregate(byStatus)

    const daily = await timeSeries({
      table: 'orders',
      dateField: 'created_at',
      interval: 'day',
      measures: [{ field: 'total', function: 'sum', alias: 'revenue' }],
      startDate: new Date('2026-09-01T00:00:00Z'),
      endDate: new Date('2026-09-08T00:00:00Z'),
    })

    const csv = await exportReport(byStatus, 'csv')

    expect(db.statements[0]).toEqual({
      sql: 'SELECT "status", SUM("total") AS "revenue", COUNT("id") AS "orders" FROM "orders" WHERE "created_at" >= $1 GROUP BY "status" ORDER BY "revenue" DESC LIMIT $2',
      params: [new Date('2026-01-01T00:00:00Z'), 10],
    })
    expect(rows[0]).toEqual({ status: 'paid', revenue: '1250.00', orders: '12' })
    expect(total).toBe(3)
    expect(daily.points[0]).toEqual({ date: '2026-09-01T00:00:00.000Z', values: { revenue: 310 } })
    expect(daily.interval).toBe('day')
    expect(csv.toString('utf8').split('\n').slice(0, 2)).toEqual([
      'status,revenue,orders',
      'paid,1250.00,12',
    ])
  })
})
