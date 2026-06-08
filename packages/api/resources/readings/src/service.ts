/**
 * Time-series reading service. Stores raw readings + computes
 * aggregations on-the-fly via SQL-bond friendly group-by buckets.
 *
 * @module
 */

import {
  count as dbCount,
  create,
  findMany,
  type OrderBy,
  query,
  type WhereCondition,
} from '@molecule/api-database'

import type { AggregatedPoint, Granularity, ReadingPoint, ReadingRow } from './types.js'

const TABLE = 'readings'

/**
 * Persist a single sensor reading row for the given owner.
 */
export async function ingestReading(
  ownerId: string,
  data: {
    sensor_id: string
    metric: string
    value: number
    unit?: string | null
    recorded_at?: string
    metadata?: Record<string, unknown>
  },
): Promise<ReadingRow> {
  const result = await create<ReadingRow>(TABLE, {
    owner_id: ownerId,
    sensor_id: data.sensor_id,
    metric: data.metric,
    value: data.value,
    unit: data.unit ?? null,
    recorded_at: data.recorded_at ?? new Date().toISOString(),
    metadata: data.metadata ?? null,
  } as Partial<ReadingRow>)
  return result.data!
}

/**
 * Persist multiple sensor readings in sequence, returning the number successfully inserted.
 */
export async function ingestBulk(
  ownerId: string,
  readings: Array<{
    sensor_id: string
    metric: string
    value: number
    unit?: string | null
    recorded_at?: string
    metadata?: Record<string, unknown>
  }>,
): Promise<number> {
  let n = 0
  for (const r of readings) {
    await ingestReading(ownerId, r)
    n++
  }
  return n
}

/**
 * Fetch raw, unaggregated reading points for an owner, optionally filtered by sensor, metric, and time range.
 */
export async function listRawReadings(
  ownerId: string,
  opts: {
    sensor_id?: string
    metric?: string
    from?: string
    to?: string
    limit?: number
  } = {},
): Promise<ReadingPoint[]> {
  const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: ownerId }]
  if (opts.sensor_id) where.push({ field: 'sensor_id', operator: '=', value: opts.sensor_id })
  if (opts.metric) where.push({ field: 'metric', operator: '=', value: opts.metric })
  if (opts.from) where.push({ field: 'recorded_at', operator: '>=', value: opts.from })
  if (opts.to) where.push({ field: 'recorded_at', operator: '<=', value: opts.to })

  const orderBy: OrderBy[] = [{ field: 'recorded_at', direction: 'asc' }]
  const rows = await findMany<ReadingRow>(TABLE, { where, orderBy, limit: opts.limit ?? 1000 })
  return rows.map((r) => ({
    recorded_at:
      r.recorded_at instanceof Date ? r.recorded_at.toISOString() : String(r.recorded_at),
    value: Number(r.value),
    metric: r.metric,
    sensor_id: r.sensor_id,
    unit: r.unit,
  }))
}

const GRANULARITY_TRUNC: Record<Exclude<Granularity, 'raw'>, string> = {
  '5min':
    "date_trunc('minute', recorded_at) - (extract(minute FROM recorded_at)::int % 5) * interval '1 minute'",
  hour: "date_trunc('hour', recorded_at)",
  day: "date_trunc('day', recorded_at)",
}

/**
 * Group readings into time buckets and aggregate per bucket. Returns
 * `min/max/avg/sum/count` per `(bucket, metric, sensor_id)`.
 */
export async function listAggregatedReadings(
  ownerId: string,
  opts: {
    granularity: Exclude<Granularity, 'raw'>
    sensor_id?: string
    metric?: string
    from?: string
    to?: string
    limit?: number
  },
): Promise<AggregatedPoint[]> {
  const trunc = GRANULARITY_TRUNC[opts.granularity]
  const sql = `
    SELECT
      ${trunc} AS bucket_at,
      metric,
      sensor_id,
      MIN(value) AS min,
      MAX(value) AS max,
      AVG(value) AS avg,
      SUM(value) AS sum,
      COUNT(*) AS count
    FROM ${TABLE}
    WHERE owner_id = $1
      ${opts.sensor_id ? 'AND sensor_id = $2' : ''}
      ${opts.metric ? `AND metric = $${opts.sensor_id ? 3 : 2}` : ''}
      ${opts.from ? `AND recorded_at >= $${[opts.sensor_id, opts.metric].filter(Boolean).length + 2}` : ''}
      ${opts.to ? `AND recorded_at <= $${[opts.sensor_id, opts.metric, opts.from].filter(Boolean).length + 2}` : ''}
    GROUP BY bucket_at, metric, sensor_id
    ORDER BY bucket_at ASC
    LIMIT ${opts.limit ?? 5000}
  `
  const params: Array<unknown> = [ownerId]
  if (opts.sensor_id) params.push(opts.sensor_id)
  if (opts.metric) params.push(opts.metric)
  if (opts.from) params.push(opts.from)
  if (opts.to) params.push(opts.to)

  const result = await query<{
    bucket_at: string | Date
    metric: string
    sensor_id: string
    min: number | string
    max: number | string
    avg: number | string
    sum: number | string
    count: number | string
  }>(sql, params)

  return result.rows.map((r) => ({
    bucket_at: r.bucket_at instanceof Date ? r.bucket_at.toISOString() : String(r.bucket_at),
    metric: r.metric,
    sensor_id: r.sensor_id,
    min: Number(r.min),
    max: Number(r.max),
    avg: Number(r.avg),
    sum: Number(r.sum),
    count: Number(r.count),
  }))
}

/**
 * Return the total number of readings stored for the given owner.
 */
export async function countReadings(ownerId: string): Promise<number> {
  return dbCount(TABLE, [{ field: 'owner_id', operator: '=', value: ownerId }])
}
