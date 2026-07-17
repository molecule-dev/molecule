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

  it('unwraps an HttpResponse wrapping a bare array', () => {
    // Mimic `client.get()` returning HttpResponse with bare-array body.
    const httpResponse = {
      data: [{ id: 1 }, { id: 2 }],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { method: 'GET', url: '/x' },
    }
    expect(unwrapList<{ id: number }>(httpResponse)).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('unwraps an HttpResponse wrapping a { data: T[] } envelope', () => {
    // The createBillingRouter / molecule resource routes return
    // `{ data: [...] }`. After going through HttpClient it arrives as
    // HttpResponse<{ data: T[] }>. Peel both layers.
    const httpResponse = {
      data: { data: [{ id: 1 }, { id: 2 }] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { method: 'GET', url: '/x' },
    }
    expect(unwrapList<{ id: number }>(httpResponse)).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('does NOT mis-peel application JSON shaped `{ data: { data: ... } }`', () => {
    // Without an HttpResponse-like outer shape (status field), the second
    // layer must be left alone so existing semantics are preserved.
    expect(unwrapList({ data: { data: [1, 2, 3] } })).toEqual([])
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

  it('unwraps an HttpResponse wrapping a bare resource', () => {
    const httpResponse = {
      data: { id: 1, name: 'Mira' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { method: 'GET', url: '/x' },
    }
    expect(unwrapSingle<{ id: number; name: string }>(httpResponse)).toEqual({
      id: 1,
      name: 'Mira',
    })
  })

  it('unwraps an HttpResponse wrapping a { data: T } envelope', () => {
    const httpResponse = {
      data: { data: { id: 5, name: 'Hana' } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { method: 'GET', url: '/x' },
    }
    expect(unwrapSingle<{ id: number; name: string }>(httpResponse)).toEqual({
      id: 5,
      name: 'Hana',
    })
  })

  it('does NOT mis-peel application JSON shaped `{ data: { data: ... } }`', () => {
    // Without an HttpResponse-like outer shape (status field), the existing
    // "single object" semantics returns the outer `data` field as-is.
    expect(unwrapSingle({ data: { data: { id: 5 } } })).toEqual({ data: { id: 5 } })
  })

  it('does NOT peel a resource that has its own `data` object field', () => {
    // An HttpResponse wrapping a resource `{ id, title, data: {…} }`. The `data`
    // field belongs to the resource — only a PURE `{ data: T }` envelope (one
    // key) is a double-wrap. Peeling here would silently drop id + title.
    const httpResponse = {
      data: { id: 7, title: 'Post', data: { theme: 'dark' } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { method: 'GET', url: '/x' },
    }
    expect(unwrapSingle(httpResponse)).toEqual({
      id: 7,
      title: 'Post',
      data: { theme: 'dark' },
    })
  })
})

describe('unwrapList — resource with its own `data` array field', () => {
  it('does NOT peel a resource whose own `data` field is an array', () => {
    // Not a pure `{ data: T[] }` envelope (>1 key) → must not return the
    // resource's own `data` array; a single resource passed to a list unwrap
    // yields [].
    const httpResponse = {
      data: { id: 7, tags: ['a'], data: [1, 2, 3] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { method: 'GET', url: '/x' },
    }
    expect(unwrapList(httpResponse)).toEqual([])
  })
})
