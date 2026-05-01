import { describe, expect, it } from 'vitest'

import { createVersionSchema, restoreVersionSchema } from '../validation.js'

describe('@molecule/api-resource-version-history validation', () => {
  describe('createVersionSchema', () => {
    it('accepts an object snapshot', () => {
      const result = createVersionSchema.safeParse({ snapshot: { title: 'A' } })
      expect(result.success).toBe(true)
    })

    it('accepts a primitive snapshot', () => {
      const result = createVersionSchema.safeParse({ snapshot: 'a string' })
      expect(result.success).toBe(true)
    })

    it('accepts a nested snapshot with arrays', () => {
      const result = createVersionSchema.safeParse({
        snapshot: { tags: ['a', 'b'], meta: { author: 'me', count: 1, active: true } },
      })
      expect(result.success).toBe(true)
    })

    it('accepts an optional reason', () => {
      const result = createVersionSchema.safeParse({ snapshot: {}, reason: 'autosave' })
      expect(result.success).toBe(true)
    })

    it('rejects when snapshot is missing', () => {
      const result = createVersionSchema.safeParse({ reason: 'no snapshot' })
      expect(result.success).toBe(false)
    })

    it('rejects unsupported snapshot values like undefined', () => {
      const result = createVersionSchema.safeParse({ snapshot: undefined })
      expect(result.success).toBe(false)
    })

    it('rejects an over-long reason', () => {
      const result = createVersionSchema.safeParse({ snapshot: {}, reason: 'x'.repeat(2_001) })
      expect(result.success).toBe(false)
    })
  })

  describe('restoreVersionSchema', () => {
    it('accepts an empty body', () => {
      expect(restoreVersionSchema.safeParse({}).success).toBe(true)
    })

    it('accepts an explicit reason', () => {
      expect(restoreVersionSchema.safeParse({ reason: 'undo vandalism' }).success).toBe(true)
    })

    it('rejects an over-long reason', () => {
      expect(restoreVersionSchema.safeParse({ reason: 'x'.repeat(2_001) }).success).toBe(false)
    })
  })
})
