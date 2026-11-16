import { afterEach, describe, expect, it, vi } from 'vitest'

import type { IconData } from '@molecule/app-icons'

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn(),
}))

import { getIcon } from '@molecule/app-icons'

import { renderIcon } from '../utilities/renderIcon.js'

const getIconMock = vi.mocked(getIcon)

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

/** The fields of a React element, read as plain data rather than through its props type. */
interface ElementView {
  type: unknown
  key: unknown
  props: Record<string, unknown>
}

/** Copies an object's own fields into a record, failing loudly for a non-object value. */
function recordOf(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('expected a React element or its props object')
  }
  const record: Record<string, unknown> = {}
  for (const [field, content] of Object.entries(value)) record[field] = content
  return record
}

/**
 * Reads a React element's fields as plain data.
 *
 * `React.ReactElement` types `props` as `unknown` (the type parameter defaults
 * to `unknown`), so a test that inspects an element tree matches the rendered
 * fields at runtime instead of claiming a props type the component never
 * declared.
 */
function elementView(value: unknown): ElementView {
  const fields = recordOf(value)
  return { type: fields.type, key: fields.key, props: recordOf(fields.props) }
}

/** Maps an array of React elements to views, failing loudly when the value is not an array. */
function elementsOf(value: unknown): ElementView[] {
  if (!Array.isArray(value)) {
    throw new TypeError('expected an array of React elements')
  }
  const elements: ElementView[] = []
  for (const child of value) elements.push(elementView(child))
  return elements
}

afterEach(() => {
  getIconMock.mockReset()
})

describe('renderIcon', () => {
  it('renders an <svg> React element with default viewBox + fill when icon has none', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const el = elementView(renderIcon('home'))

    expect(el.type).toBe('svg')
    expect(el.props.xmlns).toBe('http://www.w3.org/2000/svg')
    expect(el.props.viewBox).toBe('0 0 20 20')
    expect(el.props.fill).toBe('currentColor')
  })

  it('forwards className to the svg', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const el = elementView(renderIcon('home', 'w-5 h-5'))
    expect(el.props.className).toBe('w-5 h-5')
  })

  it('honours icon-supplied viewBox, fill, stroke, and stroke options', () => {
    getIconMock.mockReturnValue(fullIcon)
    const el = elementView(renderIcon('arrow-left'))

    expect(el.props.viewBox).toBe('0 0 24 24')
    expect(el.props.fill).toBe('#ff0000')
    expect(el.props.stroke).toBe('#000')
    expect(el.props.strokeWidth).toBe(2)
    expect(el.props.strokeLinecap).toBe('round')
    expect(el.props.strokeLinejoin).toBe('miter')
  })

  it('emits one <path> child per icon path entry', () => {
    getIconMock.mockReturnValue(fullIcon)
    const children = elementsOf(elementView(renderIcon('arrow-left')).props.children)

    expect(children).toHaveLength(2)
    expect(children[0].type).toBe('path')
    expect(children[0].props.d).toBe('M1 1L2 2')
    expect(children[0].props.fillRule).toBe('evenodd')
    expect(children[0].props.clipRule).toBe('evenodd')
    expect(children[1].props.d).toBe('M3 3L4 4')
  })

  it('handles a single-path icon (children is the single element, not an array)', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const children = elementView(renderIcon('home')).props.children
    // React.createElement collapses a single variadic child to the element directly.
    expect(Array.isArray(children)).toBe(false)
    expect(elementView(children).type).toBe('path')
  })

  it('looks up the icon by name via getIcon()', () => {
    getIconMock.mockReturnValue(minimalIcon)
    renderIcon('gear')
    expect(getIconMock).toHaveBeenCalledWith('gear')
  })

  it('passes a numeric React key to each path child', () => {
    getIconMock.mockReturnValue(fullIcon)
    const children = elementsOf(elementView(renderIcon('arrow-left')).props.children)
    // React stores keys on the element directly, not in props.
    expect(children[0].key).toBe('0')
    expect(children[1].key).toBe('1')
  })

  it('returns a valid React element (has $$typeof symbol)', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const el = renderIcon('home')
    expect(typeof el).toBe('object')
    expect(el).toHaveProperty('$$typeof')
  })

  it('handles icons with no fillRule/clipRule on paths', () => {
    getIconMock.mockReturnValue({
      paths: [{ d: 'M0 0L10 10' }],
    })
    const children = elementView(renderIcon('search')).props.children
    expect(Array.isArray(children)).toBe(false)
    const single = elementView(children)
    expect(single.props.d).toBe('M0 0L10 10')
    expect(single.props.fillRule).toBeUndefined()
    expect(single.props.clipRule).toBeUndefined()
  })

  it('handles an empty paths array (no path children)', () => {
    getIconMock.mockReturnValue({ paths: [] })
    const el = elementView(renderIcon('trash'))
    // React.createElement with no variadic children leaves props.children undefined.
    expect(el.props.children).toBeUndefined()
  })
})
