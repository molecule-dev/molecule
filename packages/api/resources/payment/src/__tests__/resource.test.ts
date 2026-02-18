/**
 * Tests for the Payment resource definition.
 */

import { describe, expect, it } from 'vitest'

import { resource } from '../resource.js'

describe('Payment resource definition', () => {
  it('should have correct name', () => {
    expect(resource.name).toBe('Payment')
  })

  it('should have correct tableName', () => {
    expect(resource.tableName).toBe('payments')
  })

  it('should have a schema', () => {
    expect(resource.schema).toBeDefined()
  })

  it('should have a schema of type object', () => {
    const schema = resource.schema as Record<string, unknown>
    expect(schema.type).toBe('object')
  })

  it('should not allow additional properties', () => {
    const schema = resource.schema as Record<string, unknown>
    expect(schema.additionalProperties).toBe(false)
  })

  it('should define required fields', () => {
    const schema = resource.schema as { required: string[] }
    expect(schema.required).toContain('userId')
    expect(schema.required).toContain('platformKey')
    expect(schema.required).toContain('productId')
  })

  it('should define all expected properties', () => {
    const schema = resource.schema as { properties: Record<string, unknown> }
    const propNames = Object.keys(schema.properties)
    expect(propNames).toContain('id')
    expect(propNames).toContain('createdAt')
    expect(propNames).toContain('updatedAt')
    expect(propNames).toContain('userId')
    expect(propNames).toContain('platformKey')
    expect(propNames).toContain('transactionId')
    expect(propNames).toContain('productId')
    expect(propNames).toContain('data')
    expect(propNames).toContain('receipt')
  })

  it('should mark transactionId as nullable', () => {
    const schema = resource.schema as {
      properties: Record<string, { nullable?: boolean }>
    }
    expect(schema.properties.transactionId.nullable).toBe(true)
  })

  it('should mark data as nullable', () => {
    const schema = resource.schema as {
      properties: Record<string, { nullable?: boolean }>
    }
    expect(schema.properties.data.nullable).toBe(true)
  })

  it('should mark receipt as nullable', () => {
    const schema = resource.schema as {
      properties: Record<string, { nullable?: boolean }>
    }
    expect(schema.properties.receipt.nullable).toBe(true)
  })
})
