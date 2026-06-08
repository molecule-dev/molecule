import { z } from 'zod'

/** Allowed location kinds for an event type. */
export const LOCATION_KINDS = ['video', 'phone', 'in_person', 'custom'] as const

/** Regex that validates a lowercase kebab-case slug (no leading/trailing hyphens). */
export const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

/** Zod schema for validating the request body when creating a new event type. */
export const eventTypeCreateSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(80).regex(slugRegex, 'slug must be lowercase kebab-case'),
  description: z.string().max(2000).nullable().optional(),
  duration_minutes: z.number().int().min(5).max(480).optional(),
  location_kind: z.enum(LOCATION_KINDS).optional(),
  location_value: z.unknown().optional(),
  buffer_before_minutes: z.number().int().min(0).max(240).optional(),
  buffer_after_minutes: z.number().int().min(0).max(240).optional(),
  min_notice_minutes: z.number().int().min(0).max(10_080).optional(),
  max_per_day: z.number().int().min(1).max(100).nullable().optional(),
  requires_confirmation: z.boolean().optional(),
  color: z.string().max(40).nullable().optional(),
  is_active: z.boolean().optional(),
  position: z.number().int().optional(),
})

/** Zod schema for validating the request body when updating an existing event type (all fields optional). */
export const eventTypeUpdateSchema = eventTypeCreateSchema.partial()

/** Zod schema for the query parameters when fetching availability slots (requires a YYYY-MM-DD date). */
export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
})

/** Zod schema for a single availability rule defining a recurring weekly time block. */
export const availabilityRuleSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_minute: z.number().int().min(0).max(1439),
  end_minute: z.number().int().min(0).max(1440),
  timezone: z.string().min(1).max(80),
})
