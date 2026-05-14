/**
 * Tests for solid-ui's framework-agnostic utility functions.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { cn } from '../utilities.js'

describe('cn', () => {
  it('joins truthy class strings with spaces', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('filters out falsy values', () => {
    expect(cn('a', false, undefined, null, '', 'b')).toBe('a b')
  })

  it('returns an empty string when nothing is truthy', () => {
    expect(cn(false, undefined, null)).toBe('')
  })
})
