import { z } from 'zod'

/** Supported time-bucket granularities for reading aggregation queries. */
export const GRANULARITIES = ['raw', '5min', 'hour', 'day'] as const

/** Zod schema for validating a single reading creation payload. */
export const readingCreateSchema = z.object({
  sensor_id: z.string().min(1).max(120),
  metric: z.string().min(1).max(80),
  value: z.number(),
  unit: z.string().max(40).nullable().optional(),
  recorded_at: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

/** Zod schema for validating a bulk readings creation payload (1–10 000 entries). */
export const readingBulkSchema = z.object({
  readings: z.array(readingCreateSchema).min(1).max(10_000),
})

/** Zod schema for validating reading list/query filter parameters. */
export const readingQuerySchema = z.object({
  sensor_id: z.string().optional(),
  metric: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  granularity: z.enum(GRANULARITIES).optional(),
  limit: z.coerce.number().int().min(1).max(10_000).optional(),
})
