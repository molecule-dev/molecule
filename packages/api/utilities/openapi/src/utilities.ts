/**
 * Shared internal helpers used by builder, converter, and validator.
 * All functions here are pure.
 *
 * @module
 */

import type { JsonSchema, ZodLikeSchema } from './types.js'

/**
 * Duck-type test for a zod schema (any major version).
 *
 * We deliberately don't `instanceof` against a specific zod export —
 * that would couple this package to a single zod release. A zod
 * schema is uniquely identifiable by having both `_def` and a
 * `safeParse` function, which are public API on every zod schema.
 *
 * @param value - Possibly-zod schema to test.
 * @returns `true` if the value looks like a zod schema.
 */
export const isZodSchema = (value: unknown): value is ZodLikeSchema => {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<ZodLikeSchema>
  return (
    typeof v.safeParse === 'function' &&
    typeof v.parse === 'function' &&
    typeof v._def === 'object' &&
    v._def !== null
  )
}

/**
 * Heuristic test for a pre-built JSON Schema object.
 *
 * Used to disambiguate schema inputs that are not zod schemas — the
 * converter falls back to passing the value through unchanged in
 * that case.
 *
 * @param value - Value to test.
 * @returns `true` if the value looks like a JSON Schema fragment.
 */
export const isJsonSchema = (value: unknown): value is JsonSchema => {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.type === 'string' ||
    typeof v.$ref === 'string' ||
    Array.isArray(v.allOf) ||
    Array.isArray(v.oneOf) ||
    Array.isArray(v.anyOf) ||
    typeof v.properties === 'object' ||
    typeof v.items === 'object' ||
    Array.isArray(v.enum) ||
    'const' in v
  )
}

/**
 * Resolve a `$ref` within a root document. Only local refs of the
 * form `#/components/schemas/Name` (or any other `#/foo/bar` JSON
 * Pointer) are supported — external refs are left unresolved.
 *
 * @param root - Root document to resolve against.
 * @param ref - Ref string starting with `#/`.
 * @returns The dereferenced schema, or `undefined` if not found.
 */
export const resolveRef = (root: unknown, ref: string): unknown => {
  if (!ref.startsWith('#/')) return undefined
  const segments = ref
    .slice(2)
    .split('/')
    .map((seg) => seg.replace(/~1/g, '/').replace(/~0/g, '~'))
  let current: unknown = root
  for (const seg of segments) {
    if (current && typeof current === 'object' && seg in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[seg]
    } else {
      return undefined
    }
  }
  return current
}

/**
 * Convert an Express-style path (`/users/:id`) to OpenAPI form
 * (`/users/{id}`). Idempotent — already-OpenAPI paths pass through.
 *
 * @param path - Path string to normalize.
 * @returns OpenAPI-compatible path.
 */
export const normalizePath = (path: string): string =>
  path.replace(/:([A-Za-z0-9_]+)/g, (_match, name) => `{${name}}`)
