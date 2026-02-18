import { describe, expect, it } from 'vitest'

import { convertPlaceholders } from '../utilities.js'

describe('convertPlaceholders', () => {
  it('should convert PostgreSQL-style placeholders to MySQL-style', () => {
    expect(convertPlaceholders('SELECT * FROM users WHERE id = $1')).toBe(
      'SELECT * FROM users WHERE id = ?',
    )
  })

  it('should convert multiple placeholders', () => {
    expect(convertPlaceholders('INSERT INTO users (name, email) VALUES ($1, $2)')).toBe(
      'INSERT INTO users (name, email) VALUES (?, ?)',
    )
  })

  it('should convert many placeholders in order', () => {
    const input = 'SELECT * FROM t WHERE a = $1 AND b = $2 AND c = $3 AND d = $4'
    const expected = 'SELECT * FROM t WHERE a = ? AND b = ? AND c = ? AND d = ?'
    expect(convertPlaceholders(input)).toBe(expected)
  })

  it('should handle queries without placeholders', () => {
    expect(convertPlaceholders('SELECT * FROM users')).toBe('SELECT * FROM users')
  })

  it('should handle placeholders with double digits', () => {
    const input = 'SELECT * FROM t WHERE a = $10 AND b = $11'
    const expected = 'SELECT * FROM t WHERE a = ? AND b = ?'
    expect(convertPlaceholders(input)).toBe(expected)
  })

  it('should preserve other query content', () => {
    const input = 'SELECT "column$name" FROM users WHERE id = $1'
    const expected = 'SELECT "column$name" FROM users WHERE id = ?'
    expect(convertPlaceholders(input)).toBe(expected)
  })
})
