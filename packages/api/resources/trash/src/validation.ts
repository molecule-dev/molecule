/**
 * Trash input validation schemas.
 *
 * @module
 */

import { z } from 'zod'

/** Recursive zod schema covering JSON-serializable snapshot values. */
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
)

/**
 * Schema for validating trash-item input (when soft-deleting via the HTTP
 * route). Routes pass `resourceType` and `resourceId` via URL params.
 */
export const trashItemSchema = z.object({
  /** Snapshot of the resource to capture before deletion. */
  snapshot: jsonValueSchema,
  /** Optional human-readable reason. */
  reason: z.string().max(2_000).optional().nullable(),
  /** Optional retention window in milliseconds. */
  ttlMs: z.number().int().positive().optional().nullable(),
})

/**
 * Schema for validating restore input. Body is optional — the trash row to
 * restore is identified by URL params.
 */
export const restoreFromTrashSchema = z
  .object({
    /** Optional reason describing why the restore was performed. */
    reason: z.string().max(2_000).optional().nullable(),
  })
  .partial()
