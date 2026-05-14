/**
 * Tests for angular-ui's framework-agnostic utility functions.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn((name: string) => {
    if (name === 'with-stroke') {
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
const { getIconSvg } = await import('../utilities/render-icon.js')

describe('cn', () => {
  it('joins truthy class strings with spaces', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('filters out falsy values', () => {
    expect(cn('a', false, undefined, null, '', 'b')).toBe('a b')
  })
})

describe('getIconSvg', () => {
  it('builds an <svg> string with the supplied className and a default viewBox', () => {
    const svg = getIconSvg('plain', 'h-4 w-4')
    expect(svg.startsWith('<svg ')).toBe(true)
    expect(svg).toContain('class="h-4 w-4"')
    expect(svg).toContain('viewBox="0 0 20 20"')
    expect(svg).toContain('fill="currentColor"')
    expect(svg).toContain('<path d="M0 0" />')
    expect(svg.endsWith('</svg>')).toBe(true)
  })

  it('includes stroke attributes and path fill/clip rules when the icon provides them', () => {
    const svg = getIconSvg('with-stroke', 'icon')
    expect(svg).toContain('viewBox="0 0 24 24"')
    expect(svg).toContain('stroke="currentColor"')
    expect(svg).toContain('stroke-width="2"')
    expect(svg).toContain('fill-rule="evenodd"')
    expect(svg).toContain('clip-rule="evenodd"')
  })
})
