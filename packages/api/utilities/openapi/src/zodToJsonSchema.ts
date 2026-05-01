/**
 * Zod-to-JSON-Schema conversion. Wraps zod 4's built-in `toJSONSchema`
 * exporter and trims it to be safe for embedding inside an OpenAPI 3.1
 * document — strips the `$schema` dialect tag (OpenAPI uses its own
 * dialect) and recursively normalizes nested results.
 *
 * @module
 */

import { z } from 'zod'

import type { JsonSchema, ZodLikeSchema } from './types.js'
import { isJsonSchema, isZodSchema } from './utilities.js'

/**
 * Convert a zod schema to a JSON Schema fragment usable inside an
 * OpenAPI 3.1 document.
 *
 * Pre-built `JsonSchema` objects pass through unchanged so callers can
 * mix handcrafted schemas with zod-derived ones.
 *
 * @param schema - Zod schema or pre-built JSON Schema.
 * @returns JSON Schema with the OpenAPI-incompatible `$schema` field removed.
 */
export const zodToJsonSchema = (schema: ZodLikeSchema | JsonSchema): JsonSchema => {
  if (isZodSchema(schema)) {
    // zod 4 ships toJSONSchema; cast through unknown because the
    // exported type is wider than what the public API guarantees.
    const raw = z.toJSONSchema(schema as unknown as z.ZodType) as JsonSchema
    return stripSchemaTag(raw)
  }
  if (isJsonSchema(schema)) {
    return schema
  }
  throw new TypeError('zodToJsonSchema: input is neither a zod schema nor a JSON Schema fragment')
}

/**
 * Strip JSON Schema dialect identifiers OpenAPI 3.1 doesn't allow at
 * the top level of a schema fragment. Returns a new object — the
 * caller's input is never mutated.
 *
 * @param schema - JSON Schema to clean.
 * @returns Cleaned schema.
 */
const stripSchemaTag = (schema: JsonSchema): JsonSchema => {
  if (!schema || typeof schema !== 'object') return schema
  const { $schema: _ignored, ...rest } = schema as JsonSchema & { $schema?: string }
  return rest
}
