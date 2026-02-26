/**
 * Tests for the Resource schema utilities.
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import {
  basePropsSchema,
  partial,
  pick,
  resourceSchema,
  responseSchema,
  safeParse,
  validate,
} from '../schema.js'

describe('basePropsSchema', () => {
  it('should validate valid base props', () => {
    const validProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    const result = basePropsSchema.safeParse(validProps)
    expect(result.success).toBe(true)
  })

  it('should reject invalid UUID', () => {
    const invalidProps = {
      id: 'not-a-uuid',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    const result = basePropsSchema.safeParse(invalidProps)
    expect(result.success).toBe(false)
  })

  it('should reject invalid datetime', () => {
    const invalidProps = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: 'not-a-date',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    const result = basePropsSchema.safeParse(invalidProps)
    expect(result.success).toBe(false)
  })

  it('should require all fields', () => {
    const missingFields = {
      id: '550e8400-e29b-41d4-a716-446655440000',
    }

    const result = basePropsSchema.safeParse(missingFields)
    expect(result.success).toBe(false)
  })
})

describe('responseSchema', () => {
  it('should validate response with props', () => {
    const propsSchema = z.object({ name: z.string() })
    const schema = responseSchema(propsSchema)

    const validResponse = {
      statusCode: 200,
      body: {
        props: { name: 'Test' },
      },
    }

    const result = schema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })

  it('should validate response with error', () => {
    const propsSchema = z.object({ name: z.string() })
    const schema = responseSchema(propsSchema)

    const validResponse = {
      statusCode: 400,
      body: {
        error: 'Something went wrong',
      },
    }

    const result = schema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })

  it('should validate response with array body', () => {
    const propsSchema = z.object({ name: z.string() })
    const schema = responseSchema(propsSchema)

    const validResponse = {
      statusCode: 200,
      body: [{ name: 'Test1' }, { name: 'Test2' }],
    }

    const result = schema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })

  it('should reject invalid status code type', () => {
    const propsSchema = z.object({ name: z.string() })
    const schema = responseSchema(propsSchema)

    const invalidResponse = {
      statusCode: 'not-a-number',
      body: { props: { name: 'Test' } },
    }

    const result = schema.safeParse(invalidResponse)
    expect(result.success).toBe(false)
  })
})

describe('resourceSchema', () => {
  it('should validate resource definition', () => {
    const propsSchema = z.object({ name: z.string() })
    const schema = resourceSchema(propsSchema)

    const validResource = {
      name: 'TestResource',
      tableName: 'test_resources',
      schema: propsSchema,
    }

    const result = schema.safeParse(validResource)
    expect(result.success).toBe(true)
  })

  it('should reject missing name', () => {
    const propsSchema = z.object({ name: z.string() })
    const schema = resourceSchema(propsSchema)

    const invalidResource = {
      tableName: 'test_resources',
      schema: propsSchema,
    }

    const result = schema.safeParse(invalidResource)
    expect(result.success).toBe(false)
  })

  it('should reject missing tableName', () => {
    const propsSchema = z.object({ name: z.string() })
    const schema = resourceSchema(propsSchema)

    const invalidResource = {
      name: 'TestResource',
      schema: propsSchema,
    }

    const result = schema.safeParse(invalidResource)
    expect(result.success).toBe(false)
  })
})

describe('validate', () => {
  it('should return data for valid input', () => {
    const schema = z.object({ name: z.string() })
    const data = { name: 'Test' }

    const result = validate(schema, data)
    expect(result).toEqual(data)
  })

  it('should throw for invalid input', () => {
    const schema = z.object({ name: z.string() })
    const data = { name: 123 }

    expect(() => validate(schema, data)).toThrow()
  })

  it('should throw with validation message', () => {
    const schema = z.object({ name: z.string().min(3) })
    const data = { name: 'ab' }

    expect(() => validate(schema, data)).toThrow('Validation failed')
  })
})

describe('safeParse', () => {
  it('should return success true for valid input', () => {
    const schema = z.object({ name: z.string() })
    const data = { name: 'Test' }

    const result = safeParse(schema, data)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(data)
    }
  })

  it('should return success false for invalid input', () => {
    const schema = z.object({ name: z.string() })
    const data = { name: 123 }

    const result = safeParse(schema, data)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeDefined()
    }
  })
})

describe('partial', () => {
  it('should create a partial schema', () => {
    const schema = z.object({
      name: z.string(),
      email: z.email(),
    })

    const partialSchema = partial(schema)

    // All fields should be optional
    const result1 = partialSchema.safeParse({})
    expect(result1.success).toBe(true)

    const result2 = partialSchema.safeParse({ name: 'Test' })
    expect(result2.success).toBe(true)

    const result3 = partialSchema.safeParse({ name: 'Test', email: 'test@example.com' })
    expect(result3.success).toBe(true)
  })
})

describe('pick', () => {
  it('should create a pick schema with specified keys', () => {
    const schema = z.object({
      id: z.string(),
      name: z.string(),
      email: z.email(),
    })

    const pickSchema = pick(schema, ['name', 'email'] as const)

    // Should validate with picked fields
    const result1 = pickSchema.safeParse({ name: 'Test', email: 'test@example.com' })
    expect(result1.success).toBe(true)
  })
})
