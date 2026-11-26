/**
 * Tests for angular-ui's framework-agnostic utility functions.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

// The mock stands in for the bonded icon set: names are real `IconName`s (the
// type `getIconSvg` accepts), and only the outlined names carry stroke data.
vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: vi.fn((name: string) => {
    if (name === 'info-circle') {
      return {
        name,
        viewBox: '0 0 24 24',
        stroke: 'currentColor',
        strokeWidth: 2,
        paths: [{ d: 'M1 1', fillRule: 'evenodd', clipRule: 'evenodd' }],
      }
    }
    return { name, paths: [{ d: 'M0 0' }] }
  }),
}))

const { cn } = await import('../utilities/utilities.js')
const { getIconSvg } = await import('../utilities/icon-markup.js')

describe('cn', () => {
  it('joins truthy class strings with spaces', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('filters out falsy values', () => {
    expect(cn('a', false, undefined, null, '', 'b')).toBe('a b')
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

describe('getIconSvg', () => {
  it('builds an <svg> string with the supplied className and a default viewBox', () => {
    const svg = getIconSvg('check', 'icon-a icon-b')
    expect(svg.startsWith('<svg ')).toBe(true)
    expect(svg).toContain('class="icon-a icon-b"')
    expect(svg).toContain('viewBox="0 0 20 20"')
    expect(svg).toContain('fill="currentColor"')
    expect(svg).toContain('<path d="M0 0" />')
    expect(svg.endsWith('</svg>')).toBe(true)
  })

  it('includes stroke attributes and path fill/clip rules when the icon provides them', () => {
    const svg = getIconSvg('info-circle', 'icon')
    expect(svg).toContain('viewBox="0 0 24 24"')
    expect(svg).toContain('stroke="currentColor"')
    expect(svg).toContain('stroke-width="2"')
    expect(svg).toContain('fill-rule="evenodd"')
    expect(svg).toContain('clip-rule="evenodd"')
  })
})
