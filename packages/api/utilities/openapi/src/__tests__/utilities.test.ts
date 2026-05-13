import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { isJsonSchema, isZodSchema, normalizePath, resolveRef } from '../utilities.js'

describe('isZodSchema', () => {
  it('true for actual zod schemas (string/number/object/etc.)', () => {
    expect(isZodSchema(z.string())).toBe(true)
    expect(isZodSchema(z.number())).toBe(true)
    expect(isZodSchema(z.object({ x: z.string() }))).toBe(true)
    expect(isZodSchema(z.array(z.number()))).toBe(true)
  })

  it('true for ZodEffects (transforms / refinements)', () => {
    expect(isZodSchema(z.string().transform((s) => s.trim()))).toBe(true)
  })

  it('false for null / undefined / primitives', () => {
    expect(isZodSchema(null)).toBe(false)
    expect(isZodSchema(undefined)).toBe(false)
    expect(isZodSchema('string')).toBe(false)
    expect(isZodSchema(42)).toBe(false)
    expect(isZodSchema(true)).toBe(false)
  })

  it('false for plain objects (no safeParse/parse/_def)', () => {
    expect(isZodSchema({})).toBe(false)
    expect(isZodSchema({ type: 'string' })).toBe(false) // JSON Schema, not zod
  })

  it('false when only some of safeParse/parse/_def are present', () => {
    expect(isZodSchema({ safeParse: () => {} })).toBe(false)
    expect(isZodSchema({ safeParse: () => {}, parse: () => {} })).toBe(false)
    expect(isZodSchema({ safeParse: () => {}, parse: () => {}, _def: null })).toBe(false)
  })

  it('true for a structurally-compatible duck-type (not bound to zod identity)', () => {
    // Critical: the check is duck-typed so other zod-like libraries pass.
    const fake = {
      safeParse: () => ({ success: true }),
      parse: (v: unknown) => v,
      _def: { typeName: 'ZodString' },
    }
    expect(isZodSchema(fake)).toBe(true)
  })
})

describe('isJsonSchema', () => {
  it('true for schemas with type', () => {
    expect(isJsonSchema({ type: 'string' })).toBe(true)
    expect(isJsonSchema({ type: 'object', properties: {} })).toBe(true)
  })

  it('true for $ref pointers', () => {
    expect(isJsonSchema({ $ref: '#/components/schemas/X' })).toBe(true)
  })

  it('true for allOf/oneOf/anyOf composites', () => {
    expect(isJsonSchema({ allOf: [] })).toBe(true)
    expect(isJsonSchema({ oneOf: [{ type: 'string' }] })).toBe(true)
    expect(isJsonSchema({ anyOf: [{ type: 'number' }] })).toBe(true)
  })

  it('true when properties or items is present (even without type)', () => {
    expect(isJsonSchema({ properties: { x: {} } })).toBe(true)
    expect(isJsonSchema({ items: {} })).toBe(true)
  })

  it('true for enum / const-only fragments', () => {
    expect(isJsonSchema({ enum: ['a', 'b'] })).toBe(true)
    expect(isJsonSchema({ const: 42 })).toBe(true)
    expect(isJsonSchema({ const: null })).toBe(true) // 'const' in v
  })

  it('false for null / primitives / arrays', () => {
    expect(isJsonSchema(null)).toBe(false)
    expect(isJsonSchema(undefined)).toBe(false)
    expect(isJsonSchema('string')).toBe(false)
    expect(isJsonSchema(42)).toBe(false)
    expect(isJsonSchema([])).toBe(false)
    expect(isJsonSchema([{ type: 'string' }])).toBe(false)
  })

  it('false for empty objects (no JSON Schema markers)', () => {
    expect(isJsonSchema({})).toBe(false)
  })

  it('false for objects with unrelated keys', () => {
    expect(isJsonSchema({ foo: 'bar' })).toBe(false)
  })
})

describe('resolveRef', () => {
  const root = {
    components: {
      schemas: {
        User: { type: 'string' },
        'Slash/In~Name': { type: 'number' },
      },
    },
  }

  it('resolves a 3-segment ref', () => {
    expect(resolveRef(root, '#/components/schemas/User')).toEqual({ type: 'string' })
  })

  it('returns undefined for refs that do not start with #/', () => {
    expect(resolveRef(root, 'components/schemas/User')).toBeUndefined()
    expect(resolveRef(root, '../other.json#/X')).toBeUndefined()
  })

  it('returns undefined for missing path', () => {
    expect(resolveRef(root, '#/components/schemas/Missing')).toBeUndefined()
    expect(resolveRef(root, '#/totally/nonexistent/path')).toBeUndefined()
  })

  it('un-escapes JSON Pointer encoded characters (~1 → / and ~0 → ~)', () => {
    expect(resolveRef(root, '#/components/schemas/Slash~1In~0Name')).toEqual({
      type: 'number',
    })
  })

  it('handles refs into nested objects (root document itself)', () => {
    expect(resolveRef(root, '#/components')).toEqual(root.components)
  })

  it('returns undefined for the bare empty pointer #/', () => {
    // The implementation splits '#/' into [''] and tries to descend into the
    // '' key, which doesn't exist — so this returns undefined rather than
    // the root. Pinned as the current behaviour.
    expect(resolveRef(root, '#/')).toBeUndefined()
  })
})

describe('normalizePath', () => {
  it('converts Express :param to OpenAPI {param}', () => {
    expect(normalizePath('/users/:id')).toBe('/users/{id}')
  })

  it('converts multiple params', () => {
    expect(normalizePath('/orgs/:orgId/users/:userId')).toBe('/orgs/{orgId}/users/{userId}')
  })

  it('passes already-OpenAPI paths through unchanged (idempotent)', () => {
    expect(normalizePath('/users/{id}')).toBe('/users/{id}')
  })

  it('preserves underscores + digits in param names', () => {
    expect(normalizePath('/foo/:user_id_2')).toBe('/foo/{user_id_2}')
  })

  it('only converts colons that look like params (not trailing colons in static segments)', () => {
    // ':id' must be followed by a word boundary; our regex requires a name body.
    // ':' alone with no [A-Za-z0-9_] after it should NOT match.
    expect(normalizePath('/foo:bar')).toBe('/foo{bar}') // still matches (no leading slash required)
    // Verify a bare ':' in the middle of static text is left alone if no letters follow:
    expect(normalizePath('/foo/:')).toBe('/foo/:')
  })

  it('passes paths with no params through unchanged', () => {
    expect(normalizePath('/health')).toBe('/health')
    expect(normalizePath('/')).toBe('/')
  })
})
