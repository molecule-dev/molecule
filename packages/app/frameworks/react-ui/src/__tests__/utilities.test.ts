/**
 * Tests for the cn utility function.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { cn } from '../utilities.js'

describe('cn utility', () => {
  it('should merge multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should filter out undefined values', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar')
  })

  it('should filter out null values', () => {
    expect(cn('foo', null, 'bar')).toBe('foo bar')
  })

  it('should filter out false values', () => {
    expect(cn('foo', false, 'bar')).toBe('foo bar')
  })

  it('should filter out empty strings', () => {
    // Empty string is falsy, so filter(Boolean) removes it
    expect(cn('foo', '', 'bar')).toBe('foo bar')
  })

  it('should handle conditional class names', () => {
    const isActive = true
    const isDisabled = false
    expect(cn('btn', isActive && 'active', isDisabled && 'disabled')).toBe('btn active')
  })

  it('should return empty string when all inputs are falsy', () => {
    expect(cn(undefined, null, false)).toBe('')
  })

  it('should handle a single class name', () => {
    expect(cn('solo')).toBe('solo')
  })

  it('should handle no arguments', () => {
    expect(cn()).toBe('')
  })

  it('should preserve whitespace within individual class strings', () => {
    // cn just joins with space, so multi-word strings remain intact
    expect(cn('foo bar', 'baz')).toBe('foo bar baz')
  })

  it('should handle many classes', () => {
    expect(cn('a', 'b', 'c', 'd', 'e')).toBe('a b c d e')
  })
})
