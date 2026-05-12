import { describe, expect, it } from 'vitest'

import { unwrapList, unwrapSingle } from '../unwrap.js'

describe('unwrapList', () => {
  it('returns a bare array as-is', () => {
    expect(unwrapList<number>([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('unwraps a { data: T[] } envelope', () => {
    expect(unwrapList<number>({ data: [4, 5] })).toEqual([4, 5])
  })

  it('returns [] when the response is null', () => {
    expect(unwrapList(null)).toEqual([])
  })

  it('returns [] when the response is undefined', () => {
    expect(unwrapList(undefined)).toEqual([])
  })

  it('returns [] when the response is a primitive', () => {
    expect(unwrapList(42)).toEqual([])
    expect(unwrapList('foo')).toEqual([])
  })

  it('returns [] when the envelope data is not an array', () => {
    expect(unwrapList({ data: { id: 1 } })).toEqual([])
    expect(unwrapList({ data: null })).toEqual([])
  })

  it('returns [] for an empty object with no data field', () => {
    expect(unwrapList({})).toEqual([])
  })

  it('returns [] for a non-array object with no data field', () => {
    expect(unwrapList({ id: 1, name: 'x' })).toEqual([])
  })
})

describe('unwrapSingle', () => {
  it('returns a non-empty object as-is', () => {
    expect(unwrapSingle<{ id: number }>({ id: 1 })).toEqual({ id: 1 })
  })

  it('unwraps a { data: T } envelope', () => {
    expect(unwrapSingle<{ id: number }>({ data: { id: 5 } })).toEqual({ id: 5 })
  })

  it('returns null when the envelope data is null', () => {
    expect(unwrapSingle({ data: null })).toBeNull()
  })

  it('returns null when the envelope data is undefined', () => {
    expect(unwrapSingle({ data: undefined })).toBeNull()
  })

  it('returns null when the envelope data is an array (mock-server no-match)', () => {
    expect(unwrapSingle({ data: [] })).toBeNull()
    expect(unwrapSingle({ data: [{ id: 1 }] })).toBeNull()
  })

  it('returns null when the envelope data is an empty object', () => {
    expect(unwrapSingle({ data: {} })).toBeNull()
  })

  it('returns null for an empty object with no data field', () => {
    expect(unwrapSingle({})).toBeNull()
  })

  it('returns null for arrays at the top level', () => {
    expect(unwrapSingle([1, 2, 3])).toBeNull()
    expect(unwrapSingle([])).toBeNull()
  })

  it('returns null for primitives', () => {
    expect(unwrapSingle(42)).toBeNull()
    expect(unwrapSingle('foo')).toBeNull()
    expect(unwrapSingle(null)).toBeNull()
    expect(unwrapSingle(undefined)).toBeNull()
  })
})
