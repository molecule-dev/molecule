/**
 * Tests for utilities.ts
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { cn } from '../utilities.js'

describe('cn utility', () => {
  it('should merge multiple string classes', () => {
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

  it('should handle conditional classes with boolean AND', () => {
    const isActive = true
    const isDisabled = false
    expect(cn('btn', isActive && 'active', isDisabled && 'disabled')).toBe('btn active')
  })

  it('should return empty string for all falsy inputs', () => {
    expect(cn(undefined, null, false)).toBe('')
  })

  it('should handle single class', () => {
    expect(cn('only-class')).toBe('only-class')
  })

  it('should handle no arguments', () => {
    expect(cn()).toBe('')
  })

  it('should handle mixed truthy and falsy', () => {
    expect(cn('a', false, 'b', null, 'c', undefined)).toBe('a b c')
  })
})
