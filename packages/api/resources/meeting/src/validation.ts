import { z } from 'zod'

/** All valid status values a meeting can be in. */
export const MEETING_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const

/** Zod schema for validating meeting creation payloads. */
export const meetingCreateSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  attendees: z
    .array(z.object({ name: z.string().min(1), email: z.string().email().optional() }))
    .optional(),
})

/** Zod schema for validating meeting update payloads. */
export const meetingUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(MEETING_STATUSES).optional(),
  scheduled_at: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  ended_at: z.string().nullable().optional(),
  recording_url: z.string().url().nullable().optional(),
  transcript: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  attendees: z
    .array(z.object({ name: z.string().min(1), email: z.string().email().optional() }))
    .optional(),
})

/** Zod schema for validating action item creation payloads. */
export const actionItemCreateSchema = z.object({
  description: z.string().min(1).max(2000),
  assignee: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  source_excerpt: z.string().nullable().optional(),
})

/** Zod schema for validating action item update payloads. */
export const actionItemUpdateSchema = actionItemCreateSchema.partial().extend({
  is_completed: z.boolean().optional(),
})
