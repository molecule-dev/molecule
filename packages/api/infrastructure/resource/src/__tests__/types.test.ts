/**
 * Tests for the Resource type definitions.
 *
 * These tests verify that the type interfaces work correctly at runtime
 * and that type guards/assertions function as expected.
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import type { DatabasePool, Props, Resource, Response, ZodResource } from '../types.js'

describe('Props interface', () => {
  it('should accept valid props object', () => {
    const props: Props = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    expect(props.id).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(props.createdAt).toBeDefined()
    expect(props.updatedAt).toBeDefined()
  })
})

describe('Resource interface', () => {
  it('should create a valid resource definition', () => {
    const resource: Resource = {
      name: 'TestResource',
      tableName: 'test_resources',
      schema: {},
    }

    expect(resource.name).toBe('TestResource')
    expect(resource.tableName).toBe('test_resources')
    expect(resource.schema).toBeDefined()
  })

  it('should accept generic schema type', () => {
    const schema = z.object({ name: z.string() })
    const resource: Resource<typeof schema> = {
      name: 'TestResource',
      tableName: 'test_resources',
      schema,
    }

    expect(resource.schema).toBe(schema)
  })
})

describe('ZodResource interface', () => {
  it('should create a valid Zod resource definition', () => {
    const schema = z.object({
      id: z.string().uuid(),
      name: z.string(),
    })

    const resource: ZodResource<typeof schema> = {
      name: 'TestResource',
      tableName: 'test_resources',
      schema,
    }

    expect(resource.name).toBe('TestResource')
    expect(resource.tableName).toBe('test_resources')
    expect(resource.schema.safeParse).toBeDefined()
  })
})

describe('DatabasePool interface', () => {
  it('should accept a pool with query method', () => {
    const mockPool: DatabasePool = {
      query: async () => ({ rows: [], rowCount: 0 }) as never,
    }

    expect(mockPool.query).toBeDefined()
    expect(typeof mockPool.query).toBe('function')
  })
})

describe('Response interface', () => {
  it('should create a successful response with props', () => {
    const response: Response<{ name: string }> = {
      statusCode: 200,
      body: {
        props: { name: 'Test' },
      },
    }

    expect(response.statusCode).toBe(200)
    const body = response.body as { props: { name: string } }
    expect(body.props.name).toBe('Test')
  })

  it('should create an error response', () => {
    const response: Response = {
      statusCode: 400,
      body: {
        error: 'Bad request',
      },
    }

    expect(response.statusCode).toBe(400)
    const body = response.body as { error: string }
    expect(body.error).toBe('Bad request')
  })

  it('should create a response with array body', () => {
    const response: Response<{ id: string }> = {
      statusCode: 200,
      body: [{ id: '1' }, { id: '2' }],
    }

    expect(response.statusCode).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })
})
