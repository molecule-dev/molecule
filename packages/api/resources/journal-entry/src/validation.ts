/**
 * Zod schemas for journal-entry create / update payloads.
 *
 * @module
 */

import { z } from 'zod'

const MOOD_VALUES = ['radiant', 'good', 'neutral', 'low', 'struggling'] as const

/** Mood level enum used by journal-entry payloads. */
export const moodLevelSchema = z.enum(MOOD_VALUES)

/** Validator for creating a new journal entry. */
export const createEntrySchema = z.object({
  mood: moodLevelSchema.optional(),
  title: z.string().max(240).optional(),
  body: z.string().min(1).max(50_000),
  tags: z.array(z.string().min(1).max(64)).max(50).optional(),
  prompt_id: z.string().uuid().optional(),
  written_at: z.string().optional(),
})

/** Validator for updating an existing journal entry. */
export const updateEntrySchema = createEntrySchema.partial().extend({
  body: z.string().min(1).max(50_000).optional(),
})
