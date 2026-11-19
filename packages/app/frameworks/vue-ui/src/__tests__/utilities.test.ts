/**
 * Tests for utilities.ts
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { cn } from '../utilities.js'

describe('cn utility', () => {
  it('should merge multiple class strings', () => {
    expect(cn('btn', 'btn-primary')).toBe('btn btn-primary')
  })

  it('should filter out undefined values', () => {
    expect(cn('btn', undefined, 'active')).toBe('btn active')
  })

  it('should filter out null values', () => {
    expect(cn('btn', null, 'active')).toBe('btn active')
  })

  it('should filter out false values', () => {
    expect(cn('btn', false, 'active')).toBe('btn active')
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
    expect(cn('only-class')).toBe('only-class')
  })

  it('should handle no arguments', () => {
    expect(cn()).toBe('')
  })

  it('should handle mixed truthy and falsy', () => {
    expect(cn('a', false, 'b', null, 'c', undefined)).toBe('a b c')
  })

  it('should preserve whitespace within individual class strings', () => {
    // cn just joins with space, so multi-word strings remain intact
    expect(cn('foo bar', 'baz')).toBe('foo bar baz')
  })

  it('should handle many classes', () => {
    expect(cn('a', 'b', 'c', 'd', 'e')).toBe('a b c d e')
  })
})
