/**
 * Tests for the Payment Zod schemas.
 */

import { describe, expect, it } from 'vitest'

import { createPropsSchema, propsSchema, updatePropsSchema } from '../schema.js'

describe('propsSchema', () => {
  const validProps = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    userId: '660e8400-e29b-41d4-a716-446655440000',
    platformKey: 'stripe' as const,
    transactionId: 'txn_123',
    productId: 'price_test_id',
    data: { customerId: 'cus_123' },
    receipt: 'receipt_data',
  }

  it('should validate valid full props', () => {
    const result = propsSchema.safeParse(validProps)
    expect(result.success).toBe(true)
  })

  it('should validate minimal required props', () => {
    const minimal = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      userId: '660e8400-e29b-41d4-a716-446655440000',
      productId: 'price_test_id',
    }
    const result = propsSchema.safeParse(minimal)
    expect(result.success).toBe(true)
  })

  it('should default platformKey to empty string', () => {
    const withoutPlatformKey = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      userId: '660e8400-e29b-41d4-a716-446655440000',
      productId: 'price_test_id',
    }
    const result = propsSchema.safeParse(withoutPlatformKey)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.platformKey).toBe('')
    }
  })

  it('should reject invalid UUID for id', () => {
    const invalid = { ...validProps, id: 'not-a-uuid' }
    const result = propsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should reject invalid UUID for userId', () => {
    const invalid = { ...validProps, userId: 'not-a-uuid' }
    const result = propsSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('should reject missing id', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = validProps
    const result = propsSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('should reject missing createdAt', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, ...rest } = validProps
    const result = propsSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('should reject missing updatedAt', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { updatedAt, ...rest } = validProps
    const result = propsSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('should reject missing userId', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId, ...rest } = validProps
    const result = propsSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('should reject missing productId', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { productId, ...rest } = validProps
    const result = propsSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('should accept platformKey "stripe"', () => {
    const result = propsSchema.safeParse({ ...validProps, platformKey: 'stripe' })
    expect(result.success).toBe(true)
  })

  it('should accept platformKey "apple"', () => {
    const result = propsSchema.safeParse({ ...validProps, platformKey: 'apple' })
    expect(result.success).toBe(true)
  })

  it('should accept platformKey "google"', () => {
    const result = propsSchema.safeParse({ ...validProps, platformKey: 'google' })
    expect(result.success).toBe(true)
  })

  it('should accept platformKey "" (empty string)', () => {
    const result = propsSchema.safeParse({ ...validProps, platformKey: '' })
    expect(result.success).toBe(true)
  })

  it('should reject invalid platformKey', () => {
    const result = propsSchema.safeParse({ ...validProps, platformKey: 'paypal' })
    expect(result.success).toBe(false)
  })

  it('should accept optional transactionId', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { transactionId, ...rest } = validProps
    const result = propsSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.transactionId).toBeUndefined()
    }
  })

  it('should accept optional data', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data, ...rest } = validProps
    const result = propsSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toBeUndefined()
    }
  })

  it('should accept optional receipt', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { receipt, ...rest } = validProps
    const result = propsSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.receipt).toBeUndefined()
    }
  })

  it('should accept data as a record of unknowns', () => {
    const result = propsSchema.safeParse({
      ...validProps,
      data: { foo: 'bar', nested: { deep: true }, count: 42 },
    })
    expect(result.success).toBe(true)
  })
})

describe('createPropsSchema', () => {
  const validCreateProps = {
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    userId: '660e8400-e29b-41d4-a716-446655440000',
    platformKey: 'stripe' as const,
    transactionId: 'txn_123',
    productId: 'price_test_id',
    data: { customerId: 'cus_123' },
    receipt: 'receipt_data',
  }

  it('should validate valid create props', () => {
    const result = createPropsSchema.safeParse(validCreateProps)
    expect(result.success).toBe(true)
  })

  it('should validate minimal create props', () => {
    const minimal = {
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      userId: '660e8400-e29b-41d4-a716-446655440000',
      productId: 'price_test_id',
    }
    const result = createPropsSchema.safeParse(minimal)
    expect(result.success).toBe(true)
  })

  it('should not include id field', () => {
    const withId = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      ...validCreateProps,
    }
    const result = createPropsSchema.safeParse(withId)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('id')
    }
  })

  it('should require createdAt', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt, ...rest } = validCreateProps
    const result = createPropsSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('should require updatedAt', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { updatedAt, ...rest } = validCreateProps
    const result = createPropsSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('should require userId', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { userId, ...rest } = validCreateProps
    const result = createPropsSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('should require productId', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { productId, ...rest } = validCreateProps
    const result = createPropsSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('should accept optional transactionId', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { transactionId, ...rest } = validCreateProps
    const result = createPropsSchema.safeParse(rest)
    expect(result.success).toBe(true)
  })

  it('should accept optional data', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data, ...rest } = validCreateProps
    const result = createPropsSchema.safeParse(rest)
    expect(result.success).toBe(true)
  })

  it('should accept optional receipt', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { receipt, ...rest } = validCreateProps
    const result = createPropsSchema.safeParse(rest)
    expect(result.success).toBe(true)
  })
})

describe('updatePropsSchema', () => {
  it('should validate valid update props with data', () => {
    const result = updatePropsSchema.safeParse({ data: { foo: 'bar' } })
    expect(result.success).toBe(true)
  })

  it('should validate valid update props with receipt', () => {
    const result = updatePropsSchema.safeParse({ receipt: 'new-receipt' })
    expect(result.success).toBe(true)
  })

  it('should validate both data and receipt', () => {
    const result = updatePropsSchema.safeParse({
      data: { updated: true },
      receipt: 'new-receipt',
    })
    expect(result.success).toBe(true)
  })

  it('should validate empty update (all fields partial)', () => {
    const result = updatePropsSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('should not include userId field', () => {
    const propsWithUserId = {
      userId: '660e8400-e29b-41d4-a716-446655440000',
      data: { foo: 'bar' },
    }
    const result = updatePropsSchema.safeParse(propsWithUserId)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('userId')
    }
  })

  it('should not include platformKey field', () => {
    const propsWithPlatformKey = {
      platformKey: 'stripe',
      data: { foo: 'bar' },
    }
    const result = updatePropsSchema.safeParse(propsWithPlatformKey)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('platformKey')
    }
  })

  it('should not include transactionId field', () => {
    const propsWithTxId = {
      transactionId: 'txn_123',
      receipt: 'rcpt',
    }
    const result = updatePropsSchema.safeParse(propsWithTxId)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('transactionId')
    }
  })
})
