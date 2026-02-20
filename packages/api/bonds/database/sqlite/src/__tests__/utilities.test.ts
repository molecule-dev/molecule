import { describe, expect, it } from 'vitest'

import { convertPlaceholders } from '../utilities.js'

describe('convertPlaceholders', () => {
  it('should return text unchanged when there are no placeholders and no values', () => {
    const result = convertPlaceholders('SELECT * FROM users')
    expect(result.text).toBe('SELECT * FROM users')
    expect(result.values).toEqual([])
  })

  it('should return empty values array when no values are provided', () => {
    const result = convertPlaceholders('SELECT * FROM users WHERE id = $1')
    expect(result.text).toBe('SELECT * FROM users WHERE id = ?')
    expect(result.values).toEqual([])
  })

  it('should convert $1, $2 placeholders to ? and map values in order', () => {
    const result = convertPlaceholders('SELECT * FROM users WHERE name = $1 AND age = $2', [
      'Alice',
      30,
    ])
    expect(result.text).toBe('SELECT * FROM users WHERE name = ? AND age = ?')
    expect(result.values).toEqual(['Alice', 30])
  })

  it('should reorder values when placeholders appear out of order ($2, $1)', () => {
    const result = convertPlaceholders('SELECT * FROM users WHERE age = $2 AND name = $1', [
      'Alice',
      30,
    ])
    expect(result.text).toBe('SELECT * FROM users WHERE age = ? AND name = ?')
    expect(result.values).toEqual([30, 'Alice'])
  })

  it('should handle repeated placeholders by duplicating the value', () => {
    const result = convertPlaceholders('SELECT * FROM users WHERE first = $1 AND last = $1', [
      'Alice',
    ])
    expect(result.text).toBe('SELECT * FROM users WHERE first = ? AND last = ?')
    expect(result.values).toEqual(['Alice', 'Alice'])
  })

  it('should handle large placeholder indices ($10, $1)', () => {
    const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']
    const result = convertPlaceholders('SELECT $10, $1', values)
    expect(result.text).toBe('SELECT ?, ?')
    expect(result.values).toEqual(['j', 'a'])
  })

  it('should handle undefined values parameter the same as empty array', () => {
    const result = convertPlaceholders('SELECT * FROM users WHERE id = $1', undefined)
    expect(result.text).toBe('SELECT * FROM users WHERE id = ?')
    expect(result.values).toEqual([])
  })

  it('should handle explicit empty values array', () => {
    const result = convertPlaceholders('SELECT * FROM users WHERE id = $1', [])
    expect(result.text).toBe('SELECT * FROM users WHERE id = ?')
    expect(result.values).toEqual([])
  })

  it('should handle text with no placeholders and provided values', () => {
    const result = convertPlaceholders('SELECT 1', ['unused'])
    expect(result.text).toBe('SELECT 1')
    expect(result.values).toEqual([])
  })

  it('should handle multiple consecutive placeholders', () => {
    const result = convertPlaceholders('INSERT INTO t (a, b, c) VALUES ($1, $2, $3)', [
      'x',
      'y',
      'z',
    ])
    expect(result.text).toBe('INSERT INTO t (a, b, c) VALUES (?, ?, ?)')
    expect(result.values).toEqual(['x', 'y', 'z'])
  })

  it('should handle mixed value types (string, number, boolean, null)', () => {
    const result = convertPlaceholders('INSERT INTO t (a, b, c, d) VALUES ($1, $2, $3, $4)', [
      'text',
      42,
      true,
      null,
    ])
    expect(result.text).toBe('INSERT INTO t (a, b, c, d) VALUES (?, ?, ?, ?)')
    expect(result.values).toEqual(['text', 42, true, null])
  })

  it('should handle complex reordering with gaps ($3, $1, $3, $2)', () => {
    const result = convertPlaceholders('SELECT $3, $1, $3, $2', ['a', 'b', 'c'])
    expect(result.text).toBe('SELECT ?, ?, ?, ?')
    expect(result.values).toEqual(['c', 'a', 'c', 'b'])
  })
})
