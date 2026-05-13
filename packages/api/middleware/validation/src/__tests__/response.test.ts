import { describe, expect, it } from 'vitest'

import { error, paginated, success } from '../response.js'

describe('paginated', () => {
  it('wraps data with pagination metadata', () => {
    const out = paginated([1, 2, 3], 100, 1, 10)
    expect(out.data).toEqual([1, 2, 3])
    expect(out.pagination).toEqual({
      page: 1,
      perPage: 10,
      total: 100,
      totalPages: 10,
      hasMore: true,
    })
  })

  it('computes totalPages with Math.ceil (partial last page rounds up)', () => {
    expect(paginated([], 11, 1, 10).pagination.totalPages).toBe(2)
    expect(paginated([], 10, 1, 10).pagination.totalPages).toBe(1)
    expect(paginated([], 0, 1, 10).pagination.totalPages).toBe(0)
  })

  it('hasMore=true when page*perPage < total', () => {
    expect(paginated([], 100, 1, 10).pagination.hasMore).toBe(true) // 10 < 100
    expect(paginated([], 100, 9, 10).pagination.hasMore).toBe(true) // 90 < 100
  })

  it('hasMore=false when at the last full page', () => {
    expect(paginated([], 100, 10, 10).pagination.hasMore).toBe(false) // 100 === 100
  })

  it('hasMore=false when past the data set', () => {
    expect(paginated([], 100, 11, 10).pagination.hasMore).toBe(false)
  })

  it('preserves the supplied data array reference', () => {
    const data = [1, 2, 3]
    expect(paginated(data, 100, 1, 10).data).toBe(data)
  })

  it('echoes back per-page + page values exactly', () => {
    const out = paginated([], 50, 3, 25)
    expect(out.pagination.page).toBe(3)
    expect(out.pagination.perPage).toBe(25)
    expect(out.pagination.total).toBe(50)
  })

  it('handles single-item-per-page pagination', () => {
    const out = paginated(['only'], 5, 3, 1)
    expect(out.pagination.totalPages).toBe(5)
    expect(out.pagination.hasMore).toBe(true) // page 3 of 5
  })
})

describe('success', () => {
  it('wraps the value in a { data } envelope', () => {
    expect(success({ id: 1 })).toEqual({ data: { id: 1 } })
  })

  it('preserves the data reference (no clone)', () => {
    const payload = { id: 1 }
    expect(success(payload).data).toBe(payload)
  })

  it('wraps primitives', () => {
    expect(success('hello')).toEqual({ data: 'hello' })
    expect(success(42)).toEqual({ data: 42 })
    expect(success(null)).toEqual({ data: null })
  })

  it('wraps arrays', () => {
    expect(success([1, 2, 3])).toEqual({ data: [1, 2, 3] })
  })
})

describe('error', () => {
  it('returns { error: message } when only message provided', () => {
    expect(error('oops')).toEqual({ error: 'oops' })
  })

  it('omits the errors key entirely when undefined', () => {
    const out = error('oops')
    expect('errors' in out).toBe(false)
  })

  it('includes field-level errors when provided', () => {
    const fields = [
      { field: 'email', message: 'Invalid format' },
      { field: 'password', message: 'Too short' },
    ]
    const out = error('Validation failed', fields)
    expect(out).toEqual({ error: 'Validation failed', errors: fields })
  })

  it('preserves empty errors array (does not strip it)', () => {
    const out = error('x', [])
    expect('errors' in out).toBe(true)
    expect((out as { errors: unknown[] }).errors).toEqual([])
  })
})
