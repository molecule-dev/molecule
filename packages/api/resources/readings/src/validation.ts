import { z } from 'zod'

export const GRANULARITIES = ['raw', '5min', 'hour', 'day'] as const

export const readingCreateSchema = z.object({
  sensor_id: z.string().min(1).max(120),
  metric: z.string().min(1).max(80),
  value: z.number(),
  unit: z.string().max(40).nullable().optional(),
  recorded_at: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const readingBulkSchema = z.object({
  readings: z.array(readingCreateSchema).min(1).max(10_000),
})

export const readingQuerySchema = z.object({
  sensor_id: z.string().optional(),
  metric: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  granularity: z.enum(GRANULARITIES).optional(),
  limit: z.coerce.number().int().min(1).max(10_000).optional(),
})
