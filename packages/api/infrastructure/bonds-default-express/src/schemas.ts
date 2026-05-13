/**
 * Common zod schemas extracted from inline duplicates across the fleet:
 * - 91 apps inline `z.object({ id: z.string().min(1) })`
 * - 43 apps inline `z.object({ id: z.string().uuid() })`
 *
 * @module
 */

import { z } from 'zod'

/**
 * Standard route-param schema for `:id`. Accepts any non-empty string.
 * Pair with `validateParams(idParamSchema)`.
 */
export const idParamSchema = z.object({ id: z.string().min(1) })

/**
 * Strict variant of `idParamSchema` that requires a UUID. Use when the
 * underlying column is a uuid.
 */
export const uuidParamSchema = z.object({ id: z.string().uuid() })
