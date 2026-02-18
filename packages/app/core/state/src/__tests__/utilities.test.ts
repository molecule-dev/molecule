import { describe, expect, it } from 'vitest'

import { produce, shallowEqual } from '../utilities.js'

describe('State Utilities', () => {
  describe('shallowEqual', () => {
    it('should return true for identical primitives', () => {
      expect(shallowEqual(1, 1)).toBe(true)
      expect(shallowEqual('hello', 'hello')).toBe(true)
      expect(shallowEqual(true, true)).toBe(true)
      expect(shallowEqual(null, null)).toBe(true)
      expect(shallowEqual(undefined, undefined)).toBe(true)
    })

    it('should return false for different primitives', () => {
      expect(shallowEqual(1, 2)).toBe(false)
      expect(shallowEqual('hello', 'world')).toBe(false)
      expect(shallowEqual(true, false)).toBe(false)
      expect(shallowEqual(null, undefined)).toBe(false)
    })

    it('should return true for same reference', () => {
      const obj = { a: 1 }
      expect(shallowEqual(obj, obj)).toBe(true)
    })

    it('should return true for shallow equal objects', () => {
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
      expect(shallowEqual({ x: 'hello' }, { x: 'hello' })).toBe(true)
    })

    it('should return false for objects with different values', () => {
      expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false)
      expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false)
    })

    it('should return false for objects with different keys', () => {
      expect(shallowEqual({ a: 1 }, { b: 1 })).toBe(false)
      expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    })

    it('should return false for different number of keys', () => {
      expect(shallowEqual({ a: 1, b: 2, c: 3 }, { a: 1 })).toBe(false)
    })

    it('should return false for nested objects with different references', () => {
      // shallowEqual only checks first level
      const nested1 = { inner: { value: 1 } }
      const nested2 = { inner: { value: 1 } }
      expect(shallowEqual(nested1, nested2)).toBe(false)
    })

    it('should return true for nested objects with same reference', () => {
      const inner = { value: 1 }
      const nested1 = { inner }
      const nested2 = { inner }
      expect(shallowEqual(nested1, nested2)).toBe(true)
    })

    it('should handle null vs object', () => {
      expect(shallowEqual(null, { a: 1 })).toBe(false)
      expect(shallowEqual({ a: 1 }, null)).toBe(false)
    })

    it('should handle arrays', () => {
      expect(shallowEqual([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(shallowEqual([1, 2, 3], [1, 2, 4])).toBe(false)
      expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false)
    })

    it('should handle NaN', () => {
      expect(shallowEqual(NaN, NaN)).toBe(true)
      expect(shallowEqual({ a: NaN }, { a: NaN })).toBe(true)
    })

    it('should handle +0 and -0', () => {
      expect(shallowEqual(0, -0)).toBe(false)
      expect(shallowEqual({ a: 0 }, { a: -0 })).toBe(false)
    })
  })

  describe('produce', () => {
    it('should create a new object', () => {
      const original = { a: 1, b: 2 }
      const result = produce(original, (draft) => {
        draft.a = 10
      })

      expect(result).not.toBe(original)
    })

    it('should apply mutations to the draft', () => {
      const original = { count: 0, name: 'test' }
      const result = produce(original, (draft) => {
        draft.count = 5
        draft.name = 'modified'
      })

      expect(result).toEqual({ count: 5, name: 'modified' })
    })

    it('should not modify the original object', () => {
      const original = { a: 1, b: 2 }
      produce(original, (draft) => {
        draft.a = 100
      })

      expect(original).toEqual({ a: 1, b: 2 })
    })

    it('should handle nested object modifications (shallow only)', () => {
      const original = { outer: { inner: 1 }, value: 'test' }
      const result = produce(original, (draft) => {
        // Note: This modifies the original nested object
        // because produce only does shallow copy
        draft.value = 'modified'
      })

      expect(result.value).toBe('modified')
      expect(result).not.toBe(original)
    })

    it('should work with arrays', () => {
      interface StateWithArray {
        items: number[]
        name: string
      }
      const original: StateWithArray = { items: [1, 2, 3], name: 'test' }
      const result = produce(original, (draft) => {
        draft.name = 'modified'
      })

      expect(result.name).toBe('modified')
      expect(result).not.toBe(original)
    })

    it('should handle empty recipe', () => {
      const original = { a: 1 }
      const result = produce(original, () => {
        // No modifications
      })

      expect(result).toEqual({ a: 1 })
      expect(result).not.toBe(original)
    })
  })
})
