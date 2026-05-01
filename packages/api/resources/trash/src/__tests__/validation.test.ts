import { describe, expect, it } from 'vitest'

import { restoreFromTrashSchema, trashItemSchema } from '../validation.js'

describe('@molecule/api-trash validation', () => {
  describe('trashItemSchema', () => {
    it('accepts a valid snapshot and optional reason / ttlMs', () => {
      const parsed = trashItemSchema.parse({
        snapshot: { title: 'Hello', body: 'World', tags: ['a', 'b'] },
        reason: 'user delete',
        ttlMs: 3600_000,
      })
      expect(parsed.reason).toBe('user delete')
      expect(parsed.ttlMs).toBe(3600_000)
    })

    it('accepts primitive snapshots', () => {
      expect(trashItemSchema.parse({ snapshot: 'a string' }).snapshot).toBe('a string')
      expect(trashItemSchema.parse({ snapshot: 42 }).snapshot).toBe(42)
      expect(trashItemSchema.parse({ snapshot: null }).snapshot).toBeNull()
    })

    it('rejects when snapshot is missing', () => {
      expect(() => trashItemSchema.parse({})).toThrow()
    })

    it('rejects negative or non-integer ttlMs', () => {
      expect(() => trashItemSchema.parse({ snapshot: {}, ttlMs: -1 })).toThrow()
      expect(() => trashItemSchema.parse({ snapshot: {}, ttlMs: 1.5 })).toThrow()
    })

    it('rejects oversized reason strings', () => {
      expect(() => trashItemSchema.parse({ snapshot: {}, reason: 'x'.repeat(2_001) })).toThrow()
    })
  })

  describe('restoreFromTrashSchema', () => {
    it('accepts an empty body', () => {
      const parsed = restoreFromTrashSchema.parse({})
      expect(parsed.reason).toBeUndefined()
    })

    it('accepts a reason', () => {
      expect(restoreFromTrashSchema.parse({ reason: 'rollback' }).reason).toBe('rollback')
    })

    it('rejects oversized reason strings', () => {
      expect(() => restoreFromTrashSchema.parse({ reason: 'x'.repeat(2_001) })).toThrow()
    })
  })
})
