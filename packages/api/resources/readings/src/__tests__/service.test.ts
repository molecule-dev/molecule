const { mockCount, mockCreate, mockFindMany, mockQuery } = vi.hoisted(() => ({
  mockCount: vi.fn(),
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
  mockQuery: vi.fn(),
}))

vi.mock('@molecule/api-database', () => ({
  count: mockCount,
  create: mockCreate,
  findMany: mockFindMany,
  query: mockQuery,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  countReadings,
  ingestBulk,
  ingestReading,
  listAggregatedReadings,
  listRawReadings,
} from '../service.js'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ingestReading', () => {
  it('persists with explicit recorded_at when provided', async () => {
    mockCreate.mockResolvedValue({ data: { id: 'r1' } })
    await ingestReading('user-1', {
      sensor_id: 's1',
      metric: 'temp',
      value: 21.5,
      recorded_at: '2026-05-13T10:00:00.000Z',
    })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.owner_id).toBe('user-1')
    expect(payload.recorded_at).toBe('2026-05-13T10:00:00.000Z')
  })

  it('falls back to now() when no recorded_at supplied', async () => {
    mockCreate.mockResolvedValue({ data: { id: 'r1' } })
    const before = Date.now()
    await ingestReading('user-1', { sensor_id: 's1', metric: 'temp', value: 1 })
    const after = Date.now()
    const stamped = Date.parse(mockCreate.mock.calls[0][1].recorded_at)
    expect(stamped).toBeGreaterThanOrEqual(before)
    expect(stamped).toBeLessThanOrEqual(after)
  })

  it('defaults unit + metadata to null when omitted', async () => {
    mockCreate.mockResolvedValue({ data: { id: 'r1' } })
    await ingestReading('user-1', { sensor_id: 's1', metric: 'temp', value: 1 })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.unit).toBeNull()
    expect(payload.metadata).toBeNull()
  })

  it('preserves unit + metadata when provided', async () => {
    mockCreate.mockResolvedValue({ data: { id: 'r1' } })
    await ingestReading('user-1', {
      sensor_id: 's1',
      metric: 'temp',
      value: 21,
      unit: 'C',
      metadata: { tag: 'kitchen' },
    })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.unit).toBe('C')
    expect(payload.metadata).toEqual({ tag: 'kitchen' })
  })
})

describe('ingestBulk', () => {
  it('returns the count of readings ingested', async () => {
    mockCreate.mockResolvedValue({ data: { id: 'r' } })
    const n = await ingestBulk('user-1', [
      { sensor_id: 's', metric: 'm', value: 1 },
      { sensor_id: 's', metric: 'm', value: 2 },
      { sensor_id: 's', metric: 'm', value: 3 },
    ])
    expect(n).toBe(3)
    expect(mockCreate).toHaveBeenCalledTimes(3)
  })

  it('scopes every row to the provided owner', async () => {
    mockCreate.mockResolvedValue({ data: { id: 'r' } })
    await ingestBulk('user-X', [
      { sensor_id: 's', metric: 'm', value: 1 },
      { sensor_id: 's', metric: 'm', value: 2 },
    ])
    for (const call of mockCreate.mock.calls) {
      expect(call[1].owner_id).toBe('user-X')
    }
  })

  it('returns 0 for empty input', async () => {
    expect(await ingestBulk('user-1', [])).toBe(0)
    expect(mockCreate).not.toHaveBeenCalled()
  })
})

describe('listRawReadings', () => {
  it('scopes by owner_id and orders ascending by recorded_at', async () => {
    mockFindMany.mockResolvedValue([])
    await listRawReadings('user-1')
    const args = mockFindMany.mock.calls[0][1]
    expect(args.where).toEqual([{ field: 'owner_id', operator: '=', value: 'user-1' }])
    expect(args.orderBy).toEqual([{ field: 'recorded_at', direction: 'asc' }])
  })

  it('builds where clause from sensor_id + metric + from + to filters', async () => {
    mockFindMany.mockResolvedValue([])
    await listRawReadings('user-1', {
      sensor_id: 's1',
      metric: 'temp',
      from: '2026-05-01T00:00:00.000Z',
      to: '2026-05-13T00:00:00.000Z',
    })
    const where = mockFindMany.mock.calls[0][1].where
    expect(where).toContainEqual({ field: 'sensor_id', operator: '=', value: 's1' })
    expect(where).toContainEqual({ field: 'metric', operator: '=', value: 'temp' })
    expect(where).toContainEqual({
      field: 'recorded_at',
      operator: '>=',
      value: '2026-05-01T00:00:00.000Z',
    })
    expect(where).toContainEqual({
      field: 'recorded_at',
      operator: '<=',
      value: '2026-05-13T00:00:00.000Z',
    })
  })

  it('defaults limit to 1000 when not supplied', async () => {
    mockFindMany.mockResolvedValue([])
    await listRawReadings('user-1')
    expect(mockFindMany.mock.calls[0][1].limit).toBe(1000)
  })

  it('honours an explicit limit', async () => {
    mockFindMany.mockResolvedValue([])
    await listRawReadings('user-1', { limit: 50 })
    expect(mockFindMany.mock.calls[0][1].limit).toBe(50)
  })

  it('coerces value to number and Date recorded_at to ISO string', async () => {
    const date = new Date('2026-05-13T12:34:56.000Z')
    mockFindMany.mockResolvedValue([
      {
        id: 'r1',
        owner_id: 'user-1',
        sensor_id: 's1',
        metric: 'temp',
        value: '21.5', // simulates pg numeric returning as string
        unit: 'C',
        recorded_at: date,
        metadata: null,
      },
    ])
    const out = await listRawReadings('user-1')
    expect(out[0].value).toBe(21.5)
    expect(typeof out[0].value).toBe('number')
    expect(out[0].recorded_at).toBe('2026-05-13T12:34:56.000Z')
  })
})

describe('listAggregatedReadings', () => {
  it('uses 5-minute truncation SQL for granularity=5min', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    await listAggregatedReadings('user-1', { granularity: '5min' })
    const sql = mockQuery.mock.calls[0][0]
    expect(sql).toContain('extract(minute FROM recorded_at)::int % 5')
  })

  it('uses date_trunc(hour) for granularity=hour', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    await listAggregatedReadings('user-1', { granularity: 'hour' })
    expect(mockQuery.mock.calls[0][0]).toContain("date_trunc('hour', recorded_at)")
  })

  it('uses date_trunc(day) for granularity=day', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    await listAggregatedReadings('user-1', { granularity: 'day' })
    expect(mockQuery.mock.calls[0][0]).toContain("date_trunc('day', recorded_at)")
  })

  it('always passes owner_id as $1', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    await listAggregatedReadings('user-7', { granularity: 'hour' })
    expect(mockQuery.mock.calls[0][1][0]).toBe('user-7')
  })

  it('appends params in declared order (sensor_id then metric then from then to)', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    await listAggregatedReadings('user-1', {
      granularity: 'hour',
      sensor_id: 's1',
      metric: 'temp',
      from: '2026-05-01T00:00:00.000Z',
      to: '2026-05-13T00:00:00.000Z',
    })
    expect(mockQuery.mock.calls[0][1]).toEqual([
      'user-1',
      's1',
      'temp',
      '2026-05-01T00:00:00.000Z',
      '2026-05-13T00:00:00.000Z',
    ])
  })

  it('omits sensor_id from params when filter absent', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    await listAggregatedReadings('user-1', {
      granularity: 'hour',
      metric: 'temp',
    })
    expect(mockQuery.mock.calls[0][1]).toEqual(['user-1', 'temp'])
  })

  it('coerces numeric aggregations to numbers (pg returns strings for numeric)', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          bucket_at: '2026-05-13T10:00:00.000Z',
          metric: 'temp',
          sensor_id: 's1',
          min: '20.5',
          max: '22.0',
          avg: '21.25',
          sum: '85',
          count: '4',
        },
      ],
    })
    const out = await listAggregatedReadings('user-1', { granularity: 'hour' })
    expect(out[0].min).toBe(20.5)
    expect(out[0].max).toBe(22)
    expect(out[0].avg).toBe(21.25)
    expect(out[0].sum).toBe(85)
    expect(out[0].count).toBe(4)
  })

  it('converts Date bucket_at to ISO string', async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          bucket_at: new Date('2026-05-13T10:00:00.000Z'),
          metric: 'temp',
          sensor_id: 's1',
          min: 1,
          max: 1,
          avg: 1,
          sum: 1,
          count: 1,
        },
      ],
    })
    const out = await listAggregatedReadings('user-1', { granularity: 'hour' })
    expect(out[0].bucket_at).toBe('2026-05-13T10:00:00.000Z')
  })

  it('defaults LIMIT to 5000 in the SQL when not supplied', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    await listAggregatedReadings('user-1', { granularity: 'hour' })
    expect(mockQuery.mock.calls[0][0]).toContain('LIMIT 5000')
  })

  it('honours an explicit limit', async () => {
    mockQuery.mockResolvedValue({ rows: [] })
    await listAggregatedReadings('user-1', { granularity: 'hour', limit: 100 })
    expect(mockQuery.mock.calls[0][0]).toContain('LIMIT 100')
  })
})

describe('countReadings', () => {
  it('returns count scoped to owner', async () => {
    mockCount.mockResolvedValue(42)
    expect(await countReadings('user-1')).toBe(42)
    expect(mockCount.mock.calls[0][1]).toEqual([
      { field: 'owner_id', operator: '=', value: 'user-1' },
    ])
  })
})
