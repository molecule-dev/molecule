/**
 * Walks ZodType._def trees to produce conformant fixture data.
 * Handles the Zod 4 type system for deterministic data generation.
 */

import type { ZodSchemaDefinition, FixtureConfig } from '../types.js'
import { createSeededRandom, seedFromPath, seededUUID } from './seed.js'
import { applySemanticRules } from './semantic-generator.js'

/**
 * Walk a serialized Zod schema definition and produce conformant data.
 * @param schema - The serialized schema definition
 * @param fieldName - The field name (for semantic heuristics)
 * @param rng - The seeded random function
 * @param index - The item index for list generation
 * @returns A conformant value matching the schema
 */
export function walkSchema(
  schema: ZodSchemaDefinition,
  fieldName: string,
  rng: () => number,
  index: number
): unknown {
  switch (schema.type) {
    case 'ZodObject':
      return walkObject(schema, rng, index)

    case 'ZodArray':
      return walkArray(schema, fieldName, rng, index)

    case 'ZodString':
      return walkString(schema, fieldName, rng, index)

    case 'ZodNumber':
      return walkNumber(schema, fieldName, rng, index)

    case 'ZodBoolean':
      return rng() > 0.5

    case 'ZodEnum':
      if (schema.enumValues && schema.enumValues.length > 0) {
        return schema.enumValues[Math.floor(rng() * schema.enumValues.length)]
      }
      return 'unknown'

    case 'ZodOptional':
    case 'ZodNullable':
      // Always generate the inner value (we want populated data for screenshots)
      if (schema.innerType) {
        return walkSchema(schema.innerType, fieldName, rng, index)
      }
      return null

    case 'ZodDefault':
      // Use the default value
      if (schema.defaultValue !== undefined) {
        return schema.defaultValue
      }
      if (schema.innerType) {
        return walkSchema(schema.innerType, fieldName, rng, index)
      }
      return null

    case 'ZodUnion':
      // Pick the first option
      if (schema.innerType) {
        return walkSchema(schema.innerType, fieldName, rng, index)
      }
      return null

    case 'ZodLiteral':
      return schema.defaultValue

    case 'ZodUnknown':
    case 'ZodAny':
      return null

    default:
      // Fallback: try semantic rules
      return applySemanticRules(fieldName, rng, index) ?? `mock-${fieldName}`
  }
}

/**
 * Walk a ZodObject schema to produce a conformant object.
 */
function walkObject(
  schema: ZodSchemaDefinition,
  rng: () => number,
  index: number
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  if (schema.shape) {
    for (const [key, fieldSchema] of Object.entries(schema.shape)) {
      result[key] = walkSchema(fieldSchema, key, rng, index)
    }
  }
  return result
}

/**
 * Walk a ZodArray schema to produce a conformant array.
 */
function walkArray(
  schema: ZodSchemaDefinition,
  fieldName: string,
  rng: () => number,
  index: number
): unknown[] {
  const count = schema.constraints?.min ?? 2
  const elementType = schema.elementType ?? { type: 'ZodString' }
  const result: unknown[] = []
  for (let i = 0; i < count; i++) {
    result.push(walkSchema(elementType, fieldName, rng, index + i))
  }
  return result
}

/**
 * Walk a ZodString schema, applying semantic rules for realistic values.
 */
function walkString(
  _schema: ZodSchemaDefinition,
  fieldName: string,
  rng: () => number,
  index: number
): string {
  // Try semantic rule first
  const semantic = applySemanticRules(fieldName, rng, index)
  if (typeof semantic === 'string') {
    return semantic
  }
  // Fallback to a generic string
  return `mock-${fieldName}-${index}`
}

/**
 * Walk a ZodNumber schema, applying semantic rules and constraints.
 */
function walkNumber(
  schema: ZodSchemaDefinition,
  fieldName: string,
  rng: () => number,
  index: number
): number {
  // Try semantic rule first
  const semantic = applySemanticRules(fieldName, rng, index)
  if (typeof semantic === 'number') {
    return semantic
  }

  const c = schema.constraints
  let min = c?.min ?? 0
  const max = c?.max ?? 1000

  if (c?.positive && min <= 0) {
    min = 1
  }

  let value = rng() * (max - min) + min

  if (c?.int) {
    value = Math.floor(value)
  } else {
    value = Math.round(value * 100) / 100
  }

  return value
}

/**
 * Generate a single conformant record from a schema, enriched with
 * standard fields (id, created_at, updated_at, user_id).
 * @param schema - The serialized Zod schema definition
 * @param rng - The seeded random function
 * @param index - The item index
 * @returns A record with all schema fields plus standard fields
 */
export function generateRecord(
  schema: ZodSchemaDefinition | undefined,
  rng: () => number,
  index: number
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: seededUUID(rng),
    created_at: new Date(Date.now() - Math.floor(rng() * 90 * 24 * 60 * 60 * 1000)).toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (schema && schema.type === 'ZodObject' && schema.shape) {
    for (const [key, fieldSchema] of Object.entries(schema.shape)) {
      base[key] = walkSchema(fieldSchema, key, rng, index)
    }
  }

  return base
}

/**
 * Generate multiple records from a schema definition.
 * @param schema - The serialized Zod schema definition
 * @param count - Number of records to generate
 * @param appType - App type for seed derivation
 * @param path - Endpoint path for seed derivation
 * @param config - Optional fixture configuration
 * @returns An array of conformant records
 */
export function generateRecords(
  schema: ZodSchemaDefinition | undefined,
  count: number,
  appType: string,
  path: string,
  config?: FixtureConfig
): Record<string, unknown>[] {
  const seed = config?.seed ?? seedFromPath(appType, path)
  const rng = createSeededRandom(seed)
  const records: Record<string, unknown>[] = []

  for (let i = 0; i < count; i++) {
    records.push(generateRecord(schema, rng, i))
  }

  return records
}
