/**
 * Tests for svelte-ui's framework-agnostic utility functions.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

const { cn, getInitials, generatePaginationRange } = await import('../utilities.js')
const { getIconData, statusIconMap } = await import('../utilities/renderIcon.js')

describe('cn', () => {
  it('joins truthy class strings with spaces', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('filters out falsy values', () => {
    expect(cn('a', false, undefined, null, 'b', '')).toBe('a b')
  })

  it('returns an empty string when nothing is truthy', () => {
    expect(cn(false, undefined, null)).toBe('')
  })

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

describe('getInitials', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(getInitials('john doe')).toBe('JD')
  })

  it('caps at two initials even for longer names', () => {
    expect(getInitials('mary jane watson')).toBe('MJ')
  })

  it('handles a single-word name', () => {
    expect(getInitials('cher')).toBe('C')
  })
})

describe('generatePaginationRange', () => {
  it('lists every page contiguously when the range needs no ellipsis', () => {
    expect(generatePaginationRange(2, 3, 1, 1)).toEqual([1, 2, 3])
  })

  it('inserts a trailing ellipsis when the current page is near the start', () => {
    const range = generatePaginationRange(2, 20, 1, 1)
    expect(range[0]).toBe(1)
    expect(range).toContain('ellipsis')
    expect(range[range.length - 1]).toBe(20)
  })

  it('inserts a leading ellipsis when the current page is near the end', () => {
    const range = generatePaginationRange(19, 20, 1, 1)
    expect(range[0]).toBe(1)
    expect(range[1]).toBe('ellipsis')
    expect(range[range.length - 1]).toBe(20)
  })

  it('inserts ellipses on both sides for a middle page', () => {
    const range = generatePaginationRange(10, 20, 1, 1)
    expect(range.filter((x) => x === 'ellipsis')).toHaveLength(2)
    expect(range).toContain(9)
    expect(range).toContain(10)
    expect(range).toContain(11)
  })

  it('never duplicates a page number', () => {
    const range = generatePaginationRange(3, 10, 2, 2)
    const numbers = range.filter((x): x is number => typeof x === 'number')
    expect(new Set(numbers).size).toBe(numbers.length)
  })
})

describe('getIconData', () => {
  it('delegates to getIcon and returns its data', () => {
    expect(getIconData('check-circle')).toMatchObject({ name: 'check-circle' })
  })
})

describe('statusIconMap', () => {
  it('maps each alert/toast status to an icon name', () => {
    expect(statusIconMap).toMatchObject({
      info: 'info-circle',
      success: 'check-circle',
      warning: 'exclamation-triangle',
      error: 'x-circle',
    })
  })
})
