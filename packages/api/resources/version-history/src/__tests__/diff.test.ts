import { describe, expect, it } from 'vitest'

import { diffSnapshots, jsonEqual } from '../diff.js'

describe('@molecule/api-resource-version-history diff', () => {
  describe('jsonEqual', () => {
    it('returns true for identical primitives', () => {
      expect(jsonEqual('a', 'a')).toBe(true)
      expect(jsonEqual(1, 1)).toBe(true)
      expect(jsonEqual(true, true)).toBe(true)
      expect(jsonEqual(null, null)).toBe(true)
    })

    it('returns false for different primitives', () => {
      expect(jsonEqual('a', 'b')).toBe(false)
      expect(jsonEqual(1, 2)).toBe(false)
      expect(jsonEqual(true, false)).toBe(false)
    })

    it('returns false when types differ', () => {
      expect(jsonEqual(1, '1')).toBe(false)
      expect(jsonEqual(null, undefined)).toBe(false)
      expect(jsonEqual([], {})).toBe(false)
    })

    it('handles arrays deeply', () => {
      expect(jsonEqual([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(jsonEqual([1, 2], [1, 2, 3])).toBe(false)
      expect(jsonEqual([{ a: 1 }], [{ a: 1 }])).toBe(true)
      expect(jsonEqual([{ a: 1 }], [{ a: 2 }])).toBe(false)
    })

    it('handles objects deeply', () => {
      expect(jsonEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
      expect(jsonEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
      expect(jsonEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true)
      expect(jsonEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false)
    })
  })

  describe('diffSnapshots', () => {
    it('emits per-key after for first version of an object', () => {
      const changes = diffSnapshots(null, { title: 'Doc', body: 'Hello' })
      expect(changes).toEqual({
        title: { after: 'Doc' },
        body: { after: 'Hello' },
      })
    })

    it('emits a single $value for first version of a primitive', () => {
      const changes = diffSnapshots(null, 'hello')
      expect(changes).toEqual({ $value: { after: 'hello' } })
    })

    it('returns an empty object when snapshots are equal', () => {
      const changes = diffSnapshots(
        { title: 'Doc', tags: ['a', 'b'] },
        { title: 'Doc', tags: ['a', 'b'] },
      )
      expect(changes).toEqual({})
    })

    it('emits before/after for changed keys', () => {
      const changes = diffSnapshots({ title: 'Old', body: 'Same' }, { title: 'New', body: 'Same' })
      expect(changes).toEqual({ title: { before: 'Old', after: 'New' } })
    })

    it('emits after only for added keys', () => {
      const changes = diffSnapshots({ title: 'Doc' }, { title: 'Doc', body: 'Added' })
      expect(changes).toEqual({ body: { after: 'Added' } })
    })

    it('emits before only for removed keys', () => {
      const changes = diffSnapshots({ title: 'Doc', body: 'Removed' }, { title: 'Doc' })
      expect(changes).toEqual({ body: { before: 'Removed' } })
    })

    it('treats null-to-value transitions correctly', () => {
      const changes = diffSnapshots({ subtitle: null }, { subtitle: 'A subtitle' })
      expect(changes).toEqual({ subtitle: { before: null, after: 'A subtitle' } })
    })

    it('detects array reorderings as changes', () => {
      const changes = diffSnapshots({ tags: ['a', 'b'] }, { tags: ['b', 'a'] })
      expect(changes).toEqual({ tags: { before: ['a', 'b'], after: ['b', 'a'] } })
    })

    it('treats nested object changes as a whole-key change', () => {
      const changes = diffSnapshots({ meta: { author: 'Alice' } }, { meta: { author: 'Bob' } })
      expect(changes).toEqual({
        meta: { before: { author: 'Alice' }, after: { author: 'Bob' } },
      })
    })

    it('emits $value diff when both snapshots are primitives', () => {
      const changes = diffSnapshots('hello', 'world')
      expect(changes).toEqual({ $value: { before: 'hello', after: 'world' } })
    })

    it('emits $value diff when shapes do not match', () => {
      const changes = diffSnapshots('hello', { greeting: 'hello' })
      expect(changes).toEqual({ $value: { before: 'hello', after: { greeting: 'hello' } } })
    })
  })
})
