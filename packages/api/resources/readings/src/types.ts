export type Granularity = 'raw' | '5min' | 'hour' | 'day'

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

export interface ReadingPoint {
  recorded_at: string
  value: number
  metric: string
  sensor_id: string
  unit: string | null
}

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
