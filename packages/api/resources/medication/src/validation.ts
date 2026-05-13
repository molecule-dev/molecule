import { z } from 'zod'

export const MEDICATION_FREQUENCIES = [
  'once',
  'daily',
  'twice_daily',
  'three_times_daily',
  'four_times_daily',
  'as_needed',
  'weekly',
  'custom',
] as const

export const LOG_STATUSES = ['taken', 'skipped', 'late', 'missed'] as const

export const medicationCreateSchema = z.object({
  name: z.string().min(1).max(255),
  generic_name: z.string().max(255).nullable().optional(),
  dosage: z.string().min(1).max(80),
  unit: z.string().max(40).nullable().optional(),
  frequency: z.enum(MEDICATION_FREQUENCIES).optional(),
  times_of_day: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const medicationUpdateSchema = medicationCreateSchema.partial().extend({
  is_active: z.boolean().optional(),
})

export const logCreateSchema = z.object({
  taken_at: z.string().optional(),
  status: z.enum(LOG_STATUSES).optional(),
  notes: z.string().max(2000).nullable().optional(),
})
