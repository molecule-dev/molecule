/** Time-bucket granularity options for aggregating sensor readings. */
export type Granularity = 'raw' | '5min' | 'hour' | 'day'

/** Raw database row shape for a single sensor reading record. */
export interface ReadingRow {
  id: string
  owner_id: string
  sensor_id: string
  metric: string
  value: number
  unit: string | null
  recorded_at: string | Date
  metadata: Record<string, unknown> | null
}

/** A single sensor reading data point returned from a query. */
export interface ReadingPoint {
  recorded_at: string
  value: number
  metric: string
  sensor_id: string
  unit: string | null
}

/** A time-bucketed aggregate of sensor readings (min/max/avg/sum/count per bucket). */
export interface AggregatedPoint {
  bucket_at: string
  metric: string
  sensor_id: string
  min: number
  max: number
  avg: number
  sum: number
  count: number
}
