/**
 * Zod schemas for task request bodies + query params.
 *
 * @module
 */

import { z } from 'zod'

export const taskCreateSchema = z.object({
  title: z.string().min(1).max(1000),
  description: z.string().max(10_000).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  priority: z.number().int().min(1).max(4).optional(),
  due_date: z.string().nullable().optional(),
  due_time: z.string().nullable().optional(),
  recurrence_rule: z.string().nullable().optional(),
  position: z.number().optional(),
})

export const taskUpdateSchema = taskCreateSchema.partial().extend({
  is_completed: z.boolean().optional(),
})

export const reorderSchema = z.object({
  tasks: z
    .array(
      z.object({
        id: z.string().uuid(),
        position: z.number(),
      }),
    )
    .min(1),
})

export const taskListQuerySchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  completed: z.coerce.boolean().optional(),
  due_date: z.string().optional(),
  filter: z.enum(['today', 'upcoming']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
})
