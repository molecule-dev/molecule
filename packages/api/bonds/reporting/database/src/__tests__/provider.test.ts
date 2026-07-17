import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReportProvider } from '@molecule/api-reporting'

import type { DatabaseReportProvider, ReportDelivery, StoredSchedule } from '../types.js'

const mockQuery = vi.fn().mockResolvedValue({ rows: [] })

vi.mock('@molecule/api-database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}))

vi.mock('node:crypto', () => ({
  randomUUID: () => 'test-uuid-1234',
}))

let createProvider: (options?: Record<string, unknown>) => DatabaseReportProvider

describe('database reporting provider', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const mod = await import('../provider.js')
    createProvider = mod.createProvider as (
      options?: Record<string, unknown>,
    ) => DatabaseReportProvider
  })

  describe('createProvider', () => {
    it('should create a provider with all methods', () => {
      const p = createProvider()
      expect(p).toBeDefined()
      expect(typeof p.aggregate).toBe('function')
      expect(typeof p.timeSeries).toBe('function')
      expect(typeof p.export).toBe('function')
      expect(typeof p.schedule).toBe('function')
      expect(typeof p.cancelSchedule).toBe('function')
      expect(typeof p.listSchedules).toBe('function')
      expect(typeof p.runDueReports).toBe('function')
    })

    it('should accept custom options', () => {
      const p = createProvider({ tablePrefix: 'rpt_', maxRows: 500 })
      expect(p).toBeDefined()
    })
  })

  describe('aggregate', () => {
    it('should execute a basic aggregate query', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ __count: 42 }] })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })

      const p = createProvider()
      const result = await p.aggregate({
        table: 'orders',
        measures: [{ field: '*', function: 'count' }],
      })

      expect(result.rows).toEqual([{ __count: 42 }])
      expect(result.total).toBe(1)
      expect(mockQuery).toHaveBeenCalledTimes(2)
    })

    it('should handle dimensions (GROUP BY)', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { status: 'active', __count: 30 },
            { status: 'inactive', __count: 12 },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ total: '2' }] })

      const p = createProvider()
      const result = await p.aggregate({
        table: 'users',
        measures: [{ field: '*', function: 'count' }],
        dimensions: ['status'],
      })

      expect(result.rows).toHaveLength(2)
      expect(result.total).toBe(2)

      const dataSql = mockQuery.mock.calls[0][0] as string
      expect(dataSql).toContain('GROUP BY')
      expect(dataSql).toContain('"status"')
    })

    it('should handle filters (WHERE)', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ revenue_sum: 1000 }] })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })

      const p = createProvider()
      await p.aggregate({
        table: 'orders',
        measures: [{ field: 'revenue', function: 'sum' }],
        filters: [{ field: 'status', operator: 'eq', value: 'completed' }],
      })

      const dataSql = mockQuery.mock.calls[0][0] as string
      expect(dataSql).toContain('WHERE')
      expect(dataSql).toContain('"status" = $1')
    })

    it('should handle having filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })

      const p = createProvider()
      await p.aggregate({
        table: 'orders',
        measures: [{ field: 'revenue', function: 'sum', alias: 'total_revenue' }],
        dimensions: ['category'],
        having: [{ field: 'total_revenue', operator: 'gt', value: 1000 }],
      })

      const dataSql = mockQuery.mock.calls[0][0] as string
      expect(dataSql).toContain('HAVING')
    })

    it('should handle orderBy and limit', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })

      const p = createProvider()
      await p.aggregate({
        table: 'products',
        measures: [{ field: 'sales', function: 'sum', alias: 'total_sales' }],
        dimensions: ['category'],
        orderBy: [{ field: 'total_sales', direction: 'desc' }],
        limit: 10,
      })

      const dataSql = mockQuery.mock.calls[0][0] as string
      expect(dataSql).toContain('ORDER BY')
      expect(dataSql).toContain('DESC')
      expect(dataSql).toContain('LIMIT')
    })

    it('should use maxRows default when no limit specified', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })

      const p = createProvider({ maxRows: 500 })
      await p.aggregate({
        table: 'orders',
        measures: [{ field: '*', function: 'count' }],
      })

      const params = mockQuery.mock.calls[0][1] as unknown[]
      expect(params).toContain(500)
    })

    it('should return total 0 when count result is empty', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] })

      const p = createProvider()
      const result = await p.aggregate({
        table: 'orders',
        measures: [{ field: '*', function: 'count' }],
      })

      expect(result.total).toBe(0)
    })
  })

  describe('timeSeries', () => {
    it('should execute a basic time-series query', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { date: new Date('2024-01-01'), __count: 10 },
          { date: new Date('2024-01-02'), __count: 15 },
        ],
      })

      const p = createProvider()
      const result = await p.timeSeries({
        table: 'orders',
        dateField: 'created_at',
        interval: 'day',
        measures: [{ field: '*', function: 'count' }],
      })

      expect(result.interval).toBe('day')
      expect(result.points).toHaveLength(2)
      expect(result.points[0].date).toContain('2024-01-01')
      expect(result.points[0].values.__count).toBe(10)

      const sql = mockQuery.mock.calls[0][0] as string
      expect(sql).toContain("date_trunc('day'")
      expect(sql).toContain('GROUP BY date_trunc(\'day\', "created_at")')
      expect(sql).toContain('ORDER BY date_trunc(\'day\', "created_at") ASC')
    })

    it('should handle date range filters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const p = createProvider()
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')

      await p.timeSeries({
        table: 'orders',
        dateField: 'created_at',
        interval: 'month',
        measures: [{ field: '*', function: 'count' }],
        startDate,
        endDate,
      })

      const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]]
      expect(sql).toContain('"created_at" >=')
      expect(sql).toContain('"created_at" <=')
      expect(params).toContain(startDate)
      expect(params).toContain(endDate)
    })

    it('should convert non-Date values to strings', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ date: '2024-03-01T00:00:00.000Z', revenue_sum: '2500.50' }],
      })

      const p = createProvider()
      const result = await p.timeSeries({
        table: 'orders',
        dateField: 'created_at',
        interval: 'month',
        measures: [{ field: 'revenue', function: 'sum' }],
      })

      expect(result.points[0].date).toBe('2024-03-01T00:00:00.000Z')
      expect(result.points[0].values.revenue_sum).toBe(2500.5)
    })

    it('should return empty points for empty result', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const p = createProvider()
      const result = await p.timeSeries({
        table: 'orders',
        dateField: 'created_at',
        interval: 'day',
        measures: [{ field: '*', function: 'count' }],
      })

      expect(result.points).toEqual([])
      expect(result.interval).toBe('day')
    })
  })

  describe('export', () => {
    it('should export aggregate query as CSV', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { category: 'Electronics', total_revenue: 5000 },
          { category: 'Books', total_revenue: 2000 },
        ],
      })

      const p = createProvider()
      const buf = await p.export(
        {
          table: 'orders',
          measures: [{ field: 'revenue', function: 'sum', alias: 'total_revenue' }],
          dimensions: ['category'],
        },
        'csv',
      )

      const csv = buf.toString()
      expect(csv).toContain('category,total_revenue')
      expect(csv).toContain('Electronics,5000')
      expect(csv).toContain('Books,2000')
    })

    it('should export aggregate query as JSON', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ category: 'Electronics', total_revenue: 5000 }],
      })

      const p = createProvider()
      const buf = await p.export(
        {
          table: 'orders',
          measures: [{ field: 'revenue', function: 'sum', alias: 'total_revenue' }],
          dimensions: ['category'],
        },
        'json',
      )

      const data = JSON.parse(buf.toString())
      expect(data).toEqual([{ category: 'Electronics', total_revenue: 5000 }])
    })

    it('should export aggregate query as XLSX (XML Spreadsheet)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ category: 'Electronics', total_revenue: 5000 }],
      })

      const p = createProvider()
      const buf = await p.export(
        {
          table: 'orders',
          measures: [{ field: 'revenue', function: 'sum', alias: 'total_revenue' }],
          dimensions: ['category'],
        },
        'xlsx',
      )

      const xml = buf.toString()
      expect(xml).toContain('<?xml version="1.0"?>')
      expect(xml).toContain('Excel.Sheet')
      expect(xml).toContain('Electronics')
      expect(xml).toContain('5000')
    })

    it('should export time-series query as CSV', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { date: new Date('2024-01-01'), revenue_sum: 1000 },
          { date: new Date('2024-02-01'), revenue_sum: 1500 },
        ],
      })

      const p = createProvider()
      const buf = await p.export(
        {
          table: 'orders',
          dateField: 'created_at',
          interval: 'month' as const,
          measures: [{ field: 'revenue', function: 'sum' as const }],
        },
        'csv',
      )

      const csv = buf.toString()
      expect(csv).toContain('date,revenue_sum')
      expect(csv).toContain('2024-01')
    })

    it('should handle empty results', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const p = createProvider()
      const buf = await p.export(
        { table: 'orders', measures: [{ field: '*', function: 'count' as const }] },
        'csv',
      )

      expect(buf.toString()).toBe('')
    })

    it('should handle empty results for XLSX', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] })

      const p = createProvider()
      const buf = await p.export(
        { table: 'orders', measures: [{ field: '*', function: 'count' as const }] },
        'xlsx',
      )

      const xml = buf.toString()
      expect(xml).toContain('<?xml version="1.0"?>')
      expect(xml).toContain('Excel.Sheet')
    })

    it('should use number type for numeric values in XLSX', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'Widget', price: 9.99 }],
      })

      const p = createProvider()
      const buf = await p.export(
        {
          table: 'products',
          measures: [{ field: 'price', function: 'avg' as const }],
          dimensions: ['name'],
        },
        'xlsx',
      )

      const xml = buf.toString()
      expect(xml).toContain('ss:Type="String"')
      expect(xml).toContain('ss:Type="Number"')
    })
  })

  describe('CSV formatting', () => {
    it('should escape values with commas', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'Smith, John', total: 100 }],
      })

      const p = createProvider()
      const buf = await p.export(
        { table: 'users', measures: [{ field: 'total', function: 'sum' as const }] },
        'csv',
      )

      const csv = buf.toString()
      expect(csv).toContain('"Smith, John"')
    })

    it('should escape values with quotes', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ desc: 'Said "hello"', total: 1 }],
      })

      const p = createProvider()
      const buf = await p.export(
        { table: 'items', measures: [{ field: 'total', function: 'count' as const }] },
        'csv',
      )

      const csv = buf.toString()
      expect(csv).toContain('"Said ""hello"""')
    })

    it('should handle null and undefined values', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: null, total: undefined }],
      })

      const p = createProvider()
      const buf = await p.export(
        { table: 'items', measures: [{ field: 'total', function: 'count' as const }] },
        'csv',
      )

      const csv = buf.toString()
      expect(csv).toContain('name,total')
      expect(csv).toContain(',')
    })
  })

  describe('XLSX formatting', () => {
    it('should escape XML special characters', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'A & B <test>', total: 1 }],
      })

      const p = createProvider()
      const buf = await p.export(
        { table: 'items', measures: [{ field: 'total', function: 'count' as const }] },
        'xlsx',
      )

      const xml = buf.toString()
      expect(xml).toContain('A &amp; B &lt;test&gt;')
    })
  })

  describe('schedule', () => {
    it('should create a scheduled report', async () => {
      const p = createProvider()
      const id = await p.schedule({
        name: 'Daily Revenue',
        query: {
          table: 'orders',
          measures: [{ field: 'revenue', function: 'sum' }],
        },
        format: 'csv',
        schedule: '0 9 * * *',
        recipients: ['admin@example.com'],
      })

      expect(id).toBe('test-uuid-1234')
      // ensureSchedulesTable runs CREATE TABLE + idempotent ALTER, then INSERT.
      expect(mockQuery).toHaveBeenCalledTimes(3)

      const createTableSql = mockQuery.mock.calls[0][0] as string
      expect(createTableSql).toContain('CREATE TABLE IF NOT EXISTS')
      expect(createTableSql).toContain('_reporting_schedules')
      expect(createTableSql).toContain('"last_run_at"')

      const alterSql = mockQuery.mock.calls[1][0] as string
      expect(alterSql).toContain('ADD COLUMN IF NOT EXISTS "last_run_at"')

      const insertSql = mockQuery.mock.calls[2][0] as string
      expect(insertSql).toContain('INSERT INTO')
    })

    it('should use custom table prefix', async () => {
      const p = createProvider({ tablePrefix: 'rpt_' })
      await p.schedule({
        name: 'Test',
        query: { table: 'orders', measures: [{ field: '*', function: 'count' }] },
        format: 'json',
        schedule: '0 0 * * *',
      })

      const createTableSql = mockQuery.mock.calls[0][0] as string
      expect(createTableSql).toContain('rpt_schedules')
    })

    it('should store null recipients when none provided', async () => {
      const p = createProvider()
      await p.schedule({
        name: 'No Recipients',
        query: { table: 'orders', measures: [{ field: '*', function: 'count' }] },
        format: 'csv',
        schedule: '0 0 * * *',
      })

      const insertParams = mockQuery.mock.calls[2][1] as unknown[]
      expect(insertParams[5]).toBeNull()
    })
  })

  describe('cancelSchedule', () => {
    it('should delete a scheduled report', async () => {
      const p = createProvider()
      await p.cancelSchedule('some-schedule-id')

      // CREATE TABLE + ALTER (ensureSchedulesTable), then DELETE.
      expect(mockQuery).toHaveBeenCalledTimes(3)

      const deleteSql = mockQuery.mock.calls[2][0] as string
      expect(deleteSql).toContain('DELETE FROM')
      expect(deleteSql).toContain('"id" = $1')

      const deleteParams = mockQuery.mock.calls[2][1] as unknown[]
      expect(deleteParams[0]).toBe('some-schedule-id')
    })
  })

  describe('listSchedules', () => {
    it('should return normalized stored schedules', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // CREATE
        .mockResolvedValueOnce({ rows: [] }) // ALTER
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'sched-1',
              name: 'Daily Revenue',
              // JSONB may arrive parsed (object) or raw (string) depending on driver.
              query: { table: 'orders', measures: [{ field: 'revenue', function: 'sum' }] },
              format: 'csv',
              schedule: '0 9 * * *',
              recipients: '["a@example.com","b@example.com"]',
              created_at: new Date('2024-01-01T00:00:00.000Z'),
              last_run_at: null,
            },
            {
              id: 'sched-2',
              name: 'No recipients',
              query: { table: 'users', measures: [{ field: '*', function: 'count' }] },
              format: 'json',
              schedule: '0 0 * * 1',
              recipients: null,
              created_at: '2024-02-01T00:00:00.000Z',
              last_run_at: new Date('2024-03-01T00:00:00.000Z'),
            },
          ],
        })

      const p = createProvider()
      const schedules = await p.listSchedules()

      expect(schedules).toHaveLength(2)
      expect(schedules[0]).toMatchObject({
        id: 'sched-1',
        name: 'Daily Revenue',
        format: 'csv',
        schedule: '0 9 * * *',
        recipients: ['a@example.com', 'b@example.com'],
        createdAt: '2024-01-01T00:00:00.000Z',
        lastRunAt: null,
      })
      expect(schedules[0].query).toEqual({
        table: 'orders',
        measures: [{ field: 'revenue', function: 'sum' }],
      })
      // Null recipients normalize to an empty array; timestamps to ISO strings.
      expect(schedules[1].recipients).toEqual([])
      expect(schedules[1].lastRunAt).toBe('2024-03-01T00:00:00.000Z')

      const selectSql = mockQuery.mock.calls[2][0] as string
      expect(selectSql).toContain('SELECT')
      expect(selectSql).toContain('_reporting_schedules')
    })
  })

  describe('runDueReports', () => {
    const dueRow = {
      id: 'sched-1',
      name: 'Daily Revenue',
      query: {
        table: 'orders',
        measures: [{ field: 'revenue', function: 'sum', alias: 'total' }],
        dimensions: ['category'],
      },
      format: 'csv',
      schedule: '30 9 * * *',
      recipients: ['admin@example.com'],
      created_at: new Date('2024-01-01T00:00:00.000Z'),
      last_run_at: null,
    }
    const dueNow = new Date('2024-06-15T09:30:00.000Z')

    it('should generate and deliver a due report, then record the run', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // CREATE
        .mockResolvedValueOnce({ rows: [] }) // ALTER
        .mockResolvedValueOnce({ rows: [dueRow] }) // SELECT schedules
        .mockResolvedValueOnce({ rows: [{ category: 'Electronics', total: 5000 }] }) // export data
        .mockResolvedValueOnce({ rows: [] }) // UPDATE last_run_at

      const delivered: ReportDelivery[] = []
      const p = createProvider()
      const result = await p.runDueReports(
        async (delivery) => {
          delivered.push(delivery)
        },
        { now: dueNow },
      )

      expect(result.delivered).toEqual(['sched-1'])
      expect(result.skipped).toEqual([])
      expect(result.failed).toEqual([])

      // The delivery carries a real generated buffer, recipients, and format.
      expect(delivered).toHaveLength(1)
      expect(delivered[0].recipients).toEqual(['admin@example.com'])
      expect(delivered[0].format).toBe('csv')
      expect(Buffer.isBuffer(delivered[0].data)).toBe(true)
      const csv = delivered[0].data.toString()
      expect(csv).toContain('category,total')
      expect(csv).toContain('Electronics,5000')

      // last_run_at is advanced so the same minute won't re-deliver.
      const updateSql = mockQuery.mock.calls[4][0] as string
      expect(updateSql).toContain('UPDATE')
      expect(updateSql).toContain('"last_run_at"')
      const updateParams = mockQuery.mock.calls[4][1] as unknown[]
      expect(updateParams[0]).toBe(dueNow.toISOString())
      expect(updateParams[1]).toBe('sched-1')
    })

    it('should skip a schedule that is not due and never call deliver', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // CREATE
        .mockResolvedValueOnce({ rows: [] }) // ALTER
        .mockResolvedValueOnce({ rows: [dueRow] }) // SELECT schedules

      const deliver = vi.fn()
      const p = createProvider()
      // 10:30 — the cron is 09:30, so this schedule is not due.
      const result = await p.runDueReports(deliver, {
        now: new Date('2024-06-15T10:30:00.000Z'),
      })

      expect(result.skipped).toEqual(['sched-1'])
      expect(result.delivered).toEqual([])
      expect(deliver).not.toHaveBeenCalled()
      // Only CREATE + ALTER + SELECT ran — no export, no UPDATE.
      expect(mockQuery).toHaveBeenCalledTimes(3)
    })

    it('should record a failed delivery without advancing last_run_at or throwing', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // CREATE
        .mockResolvedValueOnce({ rows: [] }) // ALTER
        .mockResolvedValueOnce({ rows: [dueRow] }) // SELECT schedules
        .mockResolvedValueOnce({ rows: [{ category: 'Electronics', total: 5000 }] }) // export data

      const p = createProvider()
      const result = await p.runDueReports(
        async () => {
          throw new Error('smtp down')
        },
        { now: dueNow },
      )

      expect(result.delivered).toEqual([])
      expect(result.failed).toEqual([{ id: 'sched-1', error: 'smtp down' }])
      // Export ran (call 4) but no UPDATE followed — the failed run retries later.
      expect(mockQuery).toHaveBeenCalledTimes(4)
    })

    it('should honor an injected isDue predicate', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // CREATE
        .mockResolvedValueOnce({ rows: [] }) // ALTER
        .mockResolvedValueOnce({ rows: [dueRow] }) // SELECT schedules
        .mockResolvedValueOnce({ rows: [{ category: 'Electronics', total: 5000 }] }) // export data
        .mockResolvedValueOnce({ rows: [] }) // UPDATE

      const isDue = vi.fn((_schedule: StoredSchedule, _now: Date) => true)
      const deliver = vi.fn(async () => {})
      const p = createProvider()
      // A time that the cron would NOT match, but the predicate forces due.
      const result = await p.runDueReports(deliver, {
        isDue,
        now: new Date('2024-06-15T03:00:00.000Z'),
      })

      expect(isDue).toHaveBeenCalledTimes(1)
      expect(result.delivered).toEqual(['sched-1'])
      expect(deliver).toHaveBeenCalledTimes(1)
    })
  })

  describe('provider conformance', () => {
    it('should satisfy ReportProvider interface', () => {
      const p = createProvider()
      const provider: ReportProvider = p
      expect(provider).toBeDefined()
    })
  })
})
