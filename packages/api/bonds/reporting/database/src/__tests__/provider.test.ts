import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReportProvider } from '@molecule/api-reporting'

const mockQuery = vi.fn().mockResolvedValue({ rows: [] })

vi.mock('@molecule/api-database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}))

vi.mock('node:crypto', () => ({
  randomUUID: () => 'test-uuid-1234',
}))

let createProvider: (options?: Record<string, unknown>) => ReportProvider

describe('database reporting provider', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const mod = await import('../provider.js')
    createProvider = mod.createProvider as (options?: Record<string, unknown>) => ReportProvider
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
      expect(sql).toContain('GROUP BY "date"')
      expect(sql).toContain('ORDER BY "date" ASC')
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
      expect(mockQuery).toHaveBeenCalledTimes(2)

      const createTableSql = mockQuery.mock.calls[0][0] as string
      expect(createTableSql).toContain('CREATE TABLE IF NOT EXISTS')
      expect(createTableSql).toContain('_reporting_schedules')

      const insertSql = mockQuery.mock.calls[1][0] as string
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

      const insertParams = mockQuery.mock.calls[1][1] as unknown[]
      expect(insertParams[5]).toBeNull()
    })
  })

  describe('cancelSchedule', () => {
    it('should delete a scheduled report', async () => {
      const p = createProvider()
      await p.cancelSchedule('some-schedule-id')

      expect(mockQuery).toHaveBeenCalledTimes(2)

      const deleteSql = mockQuery.mock.calls[1][0] as string
      expect(deleteSql).toContain('DELETE FROM')
      expect(deleteSql).toContain('"id" = $1')

      const deleteParams = mockQuery.mock.calls[1][1] as unknown[]
      expect(deleteParams[0]).toBe('some-schedule-id')
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
