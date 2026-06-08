import { afterEach, describe, expect, it, vi } from 'vitest'

import type { IconData } from '@molecule/app-icons'

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn(),
}))

import { getIcon } from '@molecule/app-icons'

import { renderIcon } from '../utilities/renderIcon.js'

const getIconMock = getIcon as unknown as ReturnType<typeof vi.fn>

const minimalIcon: IconData = {
  paths: [{ d: 'M0 0h20v20H0z' }],
}

const fullIcon: IconData = {
  viewBox: '0 0 24 24',
  fill: '#ff0000',
  stroke: '#000',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'miter',
  paths: [{ d: 'M1 1L2 2', fillRule: 'evenodd', clipRule: 'evenodd' }, { d: 'M3 3L4 4' }],
}

afterEach(() => {
  getIconMock.mockReset()
})

describe('renderIcon', () => {
  it('renders an <svg> React element with default viewBox + fill when icon has none', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const el = renderIcon('home')

    expect(el.type).toBe('svg')
    expect(el.props.xmlns).toBe('http://www.w3.org/2000/svg')
    expect(el.props.viewBox).toBe('0 0 20 20')
    expect(el.props.fill).toBe('currentColor')
  })

  it('forwards className to the svg', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const el = renderIcon('home', 'w-5 h-5')
    expect(el.props.className).toBe('w-5 h-5')
  })

  it('honours icon-supplied viewBox, fill, stroke, and stroke options', () => {
    getIconMock.mockReturnValue(fullIcon)
    const el = renderIcon('arrow')

    expect(el.props.viewBox).toBe('0 0 24 24')
    expect(el.props.fill).toBe('#ff0000')
    expect(el.props.stroke).toBe('#000')
    expect(el.props.strokeWidth).toBe(2)
    expect(el.props.strokeLinecap).toBe('round')
    expect(el.props.strokeLinejoin).toBe('miter')
  })

  it('emits one <path> child per icon path entry', () => {
    getIconMock.mockReturnValue(fullIcon)
    const el = renderIcon('arrow')

    const children = el.props.children as Array<{ type: string; props: Record<string, unknown> }>
    expect(children).toHaveLength(2)
    expect(children[0].type).toBe('path')
    expect(children[0].props.d).toBe('M1 1L2 2')
    expect(children[0].props.fillRule).toBe('evenodd')
    expect(children[0].props.clipRule).toBe('evenodd')
    expect(children[1].props.d).toBe('M3 3L4 4')
  })

  it('handles a single-path icon (children is the single element, not an array)', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const el = renderIcon('home')
    const children = el.props.children as { type: string } | { type: string }[]
    // React.createElement collapses a single variadic child to the element directly.
    const single = Array.isArray(children) ? children[0] : children
    expect(single.type).toBe('path')
  })

  it('looks up the icon by name via getIcon()', () => {
    getIconMock.mockReturnValue(minimalIcon)
    renderIcon('settings-cog')
    expect(getIconMock).toHaveBeenCalledWith('settings-cog')
  })

  it('passes a numeric React key to each path child', () => {
    getIconMock.mockReturnValue(fullIcon)
    const el = renderIcon('arrow')
    const children = el.props.children as Array<{ key: string | number | null }>
    // React stores keys on the element directly, not in props.
    expect(children[0].key).toBe('0')
    expect(children[1].key).toBe('1')
  })

  it('returns a valid React element (has $$typeof symbol)', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const el = renderIcon('home')
    expect(typeof el).toBe('object')
    expect((el as unknown as { $$typeof: symbol }).$$typeof).toBeDefined()
  })

  it('handles icons with no fillRule/clipRule on paths', () => {
    getIconMock.mockReturnValue({
      paths: [{ d: 'M0 0L10 10' }],
    })
    const el = renderIcon('plain')
    const children = el.props.children as
      | { props: Record<string, unknown> }
      | Array<{
          props: Record<string, unknown>
        }>
    const single = Array.isArray(children) ? children[0] : children
    expect(single.props.d).toBe('M0 0L10 10')
    expect(single.props.fillRule).toBeUndefined()
    expect(single.props.clipRule).toBeUndefined()
  })

  it('handles an empty paths array (no path children)', () => {
    getIconMock.mockReturnValue({ paths: [] })
    const el = renderIcon('blank')
    // React.createElement with no variadic children leaves props.children undefined.
    expect(el.props.children).toBeUndefined()
  })
})
