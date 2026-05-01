/**
 * Version-history input validation schemas.
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
 * Schema for validating create-version input.
 */
export const createVersionSchema = z.object({
  /** The resource snapshot to capture. Must be a JSON-serializable value. */
  snapshot: jsonValueSchema,
  /** Optional human-readable reason (e.g. commit message). */
  reason: z.string().max(2_000).optional().nullable(),
})

/**
 * Schema for validating restore-version input. Body is empty — the version
 * to restore is identified by URL params.
 */
export const restoreVersionSchema = z
  .object({
    /** Optional reason describing why the restore was performed. */
    reason: z.string().max(2_000).optional().nullable(),
  })
  .partial()
