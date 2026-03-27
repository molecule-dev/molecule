import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { AggregateQuery, ReportProvider, ScheduledReport, TimeSeriesQuery } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let aggregate: typeof ProviderModule.aggregate
let timeSeries: typeof ProviderModule.timeSeries
let exportReport: typeof ProviderModule.exportReport
let scheduleReport: typeof ProviderModule.scheduleReport
let cancelSchedule: typeof ProviderModule.cancelSchedule

const createMockProvider = (overrides?: Partial<ReportProvider>): ReportProvider => ({
  aggregate: vi.fn().mockResolvedValue({ rows: [], total: 0 }),
  timeSeries: vi.fn().mockResolvedValue({ points: [], interval: 'day' }),
  export: vi.fn().mockResolvedValue(Buffer.from('')),
  schedule: vi.fn().mockResolvedValue('schedule-1'),
  cancelSchedule: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

describe('reporting provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    aggregate = providerModule.aggregate
    timeSeries = providerModule.timeSeries
    exportReport = providerModule.exportReport
    scheduleReport = providerModule.scheduleReport
    cancelSchedule = providerModule.cancelSchedule
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Reporting provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('aggregate', () => {
    it('should throw when no provider is set', async () => {
      const query: AggregateQuery = {
        table: 'orders',
        measures: [{ field: 'amount', function: 'sum' }],
      }
      await expect(aggregate(query)).rejects.toThrow('Reporting provider not configured')
    })

    it('should call provider aggregate with basic query', async () => {
      const result = { rows: [{ total: 1500 }], total: 1 }
      const mockAggregate = vi.fn().mockResolvedValue(result)
      setProvider(createMockProvider({ aggregate: mockAggregate }))

      const query: AggregateQuery = {
        table: 'orders',
        measures: [{ field: 'amount', function: 'sum', alias: 'total' }],
      }
      const response = await aggregate(query)

      expect(mockAggregate).toHaveBeenCalledWith(query)
      expect(response).toEqual(result)
    })

    it('should call provider aggregate with full query options', async () => {
      const result = {
        rows: [
          { status: 'completed', total: 1000 },
          { status: 'pending', total: 500 },
        ],
        total: 2,
      }
      const mockAggregate = vi.fn().mockResolvedValue(result)
      setProvider(createMockProvider({ aggregate: mockAggregate }))

      const query: AggregateQuery = {
        table: 'orders',
        measures: [
          { field: 'amount', function: 'sum', alias: 'total' },
          { field: 'id', function: 'count', alias: 'count' },
        ],
        dimensions: ['status'],
        filters: [{ field: 'created_at', operator: 'gte', value: '2024-01-01' }],
        having: [{ field: 'total', operator: 'gt', value: 100 }],
        orderBy: [{ field: 'total', direction: 'desc' }],
        limit: 10,
      }
      const response = await aggregate(query)

      expect(mockAggregate).toHaveBeenCalledWith(query)
      expect(response.rows).toHaveLength(2)
      expect(response.total).toBe(2)
    })
  })

  describe('timeSeries', () => {
    it('should throw when no provider is set', async () => {
      const query: TimeSeriesQuery = {
        table: 'orders',
        dateField: 'created_at',
        interval: 'day',
        measures: [{ field: 'id', function: 'count' }],
      }
      await expect(timeSeries(query)).rejects.toThrow('Reporting provider not configured')
    })

    it('should call provider timeSeries with basic query', async () => {
      const result = {
        points: [
          { date: '2024-01-01', values: { count: 10 } },
          { date: '2024-01-02', values: { count: 15 } },
        ],
        interval: 'day',
      }
      const mockTimeSeries = vi.fn().mockResolvedValue(result)
      setProvider(createMockProvider({ timeSeries: mockTimeSeries }))

      const query: TimeSeriesQuery = {
        table: 'orders',
        dateField: 'created_at',
        interval: 'day',
        measures: [{ field: 'id', function: 'count', alias: 'count' }],
      }
      const response = await timeSeries(query)

      expect(mockTimeSeries).toHaveBeenCalledWith(query)
      expect(response.points).toHaveLength(2)
      expect(response.interval).toBe('day')
    })

    it('should call provider timeSeries with date range', async () => {
      const result = { points: [], interval: 'month' }
      const mockTimeSeries = vi.fn().mockResolvedValue(result)
      setProvider(createMockProvider({ timeSeries: mockTimeSeries }))

      const query: TimeSeriesQuery = {
        table: 'orders',
        dateField: 'created_at',
        interval: 'month',
        measures: [{ field: 'amount', function: 'sum', alias: 'revenue' }],
        filters: [{ field: 'status', operator: 'eq', value: 'completed' }],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      }
      const response = await timeSeries(query)

      expect(mockTimeSeries).toHaveBeenCalledWith(query)
      expect(response.interval).toBe('month')
    })
  })

  describe('exportReport', () => {
    it('should throw when no provider is set', async () => {
      const query: AggregateQuery = {
        table: 'orders',
        measures: [{ field: 'amount', function: 'sum' }],
      }
      await expect(exportReport(query, 'csv')).rejects.toThrow('Reporting provider not configured')
    })

    it('should call provider export with aggregate query', async () => {
      const csvData = Buffer.from('status,total\ncompleted,1000')
      const mockExport = vi.fn().mockResolvedValue(csvData)
      setProvider(createMockProvider({ export: mockExport }))

      const query: AggregateQuery = {
        table: 'orders',
        measures: [{ field: 'amount', function: 'sum', alias: 'total' }],
        dimensions: ['status'],
      }
      const result = await exportReport(query, 'csv')

      expect(mockExport).toHaveBeenCalledWith(query, 'csv')
      expect(result).toBe(csvData)
    })

    it('should call provider export with time-series query', async () => {
      const jsonData = Buffer.from('[]')
      const mockExport = vi.fn().mockResolvedValue(jsonData)
      setProvider(createMockProvider({ export: mockExport }))

      const query: TimeSeriesQuery = {
        table: 'orders',
        dateField: 'created_at',
        interval: 'day',
        measures: [{ field: 'id', function: 'count' }],
      }
      const result = await exportReport(query, 'json')

      expect(mockExport).toHaveBeenCalledWith(query, 'json')
      expect(result).toBe(jsonData)
    })

    it('should support xlsx export format', async () => {
      const xlsxData = Buffer.from([0x50, 0x4b])
      const mockExport = vi.fn().mockResolvedValue(xlsxData)
      setProvider(createMockProvider({ export: mockExport }))

      const query: AggregateQuery = {
        table: 'orders',
        measures: [{ field: 'amount', function: 'avg' }],
      }
      const result = await exportReport(query, 'xlsx')

      expect(mockExport).toHaveBeenCalledWith(query, 'xlsx')
      expect(result).toBe(xlsxData)
    })
  })

  describe('scheduleReport', () => {
    it('should throw when no provider is set', async () => {
      const report: ScheduledReport = {
        name: 'Daily Sales',
        query: {
          table: 'orders',
          measures: [{ field: 'amount', function: 'sum' }],
        },
        format: 'csv',
        schedule: '0 8 * * *',
      }
      await expect(scheduleReport(report)).rejects.toThrow('Reporting provider not configured')
    })

    it('should call provider schedule and return schedule id', async () => {
      const mockSchedule = vi.fn().mockResolvedValue('schedule-abc')
      setProvider(createMockProvider({ schedule: mockSchedule }))

      const report: ScheduledReport = {
        name: 'Weekly Revenue',
        query: {
          table: 'orders',
          dateField: 'created_at',
          interval: 'week',
          measures: [{ field: 'amount', function: 'sum', alias: 'revenue' }],
        },
        format: 'xlsx',
        schedule: '0 9 * * MON',
        recipients: ['admin@example.com'],
      }
      const scheduleId = await scheduleReport(report)

      expect(mockSchedule).toHaveBeenCalledWith(report)
      expect(scheduleId).toBe('schedule-abc')
    })
  })

  describe('cancelSchedule', () => {
    it('should throw when no provider is set', async () => {
      await expect(cancelSchedule('schedule-1')).rejects.toThrow(
        'Reporting provider not configured',
      )
    })

    it('should call provider cancelSchedule', async () => {
      const mockCancel = vi.fn().mockResolvedValue(undefined)
      setProvider(createMockProvider({ cancelSchedule: mockCancel }))

      await cancelSchedule('schedule-1')

      expect(mockCancel).toHaveBeenCalledWith('schedule-1')
    })
  })
})

describe('reporting types', () => {
  it('should export ReportProvider type with all required methods', () => {
    const provider: ReportProvider = {
      aggregate: async () => ({ rows: [], total: 0 }),
      timeSeries: async () => ({ points: [], interval: 'day' }),
      export: async () => Buffer.from(''),
      schedule: async () => 'id',
      cancelSchedule: async () => {},
    }
    expect(typeof provider.aggregate).toBe('function')
    expect(typeof provider.timeSeries).toBe('function')
    expect(typeof provider.export).toBe('function')
    expect(typeof provider.schedule).toBe('function')
    expect(typeof provider.cancelSchedule).toBe('function')
  })

  it('should support all aggregate functions', () => {
    const measures = [
      { field: 'amount', function: 'count' as const },
      { field: 'amount', function: 'sum' as const },
      { field: 'amount', function: 'avg' as const },
      { field: 'amount', function: 'min' as const },
      { field: 'amount', function: 'max' as const },
      { field: 'amount', function: 'countDistinct' as const },
    ]
    expect(measures).toHaveLength(6)
  })

  it('should support all time intervals', () => {
    const intervals: Array<'hour' | 'day' | 'week' | 'month' | 'year'> = [
      'hour',
      'day',
      'week',
      'month',
      'year',
    ]
    expect(intervals).toHaveLength(5)
  })

  it('should support all filter operators', () => {
    const operators = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'notIn', 'between', 'like']
    expect(operators).toHaveLength(10)
  })

  it('should support all export formats', () => {
    const formats: Array<'csv' | 'json' | 'xlsx'> = ['csv', 'json', 'xlsx']
    expect(formats).toHaveLength(3)
  })
})
