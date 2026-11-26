// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { IconData } from '@molecule/app-icons'

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

/** Renders an icon and returns its `<svg>`, failing loudly when there is none. */
function svgOf(element: ReturnType<typeof renderIcon>): SVGSVGElement {
  const svg = render(element).container.querySelector('svg')
  if (!svg) throw new TypeError('expected an <svg>')
  return svg
}

afterEach(() => {
  cleanup()
  getIconMock.mockReset()
})

describe('renderIcon', () => {
  it('renders an <svg> React element with default viewBox + fill when icon has none', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const svg = svgOf(renderIcon('home'))

    expect(svg.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg')
    expect(svg.getAttribute('viewBox')).toBe('0 0 20 20')
    expect(svg.getAttribute('fill')).toBe('currentColor')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('focusable')).toBe('false')
  })

  it('forwards className to the svg', () => {
    getIconMock.mockReturnValue(minimalIcon)
    expect(svgOf(renderIcon('home', 'w-5 h-5')).getAttribute('class')).toBe('w-5 h-5')
  })

  it('honours icon-supplied viewBox, fill, stroke, and stroke options', () => {
    getIconMock.mockReturnValue(fullIcon)
    const svg = svgOf(renderIcon('arrow-left'))

    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg.getAttribute('fill')).toBe('#ff0000')
    expect(svg.getAttribute('stroke')).toBe('#000')
    expect(svg.getAttribute('stroke-width')).toBe('2')
    expect(svg.getAttribute('stroke-linecap')).toBe('round')
    expect(svg.getAttribute('stroke-linejoin')).toBe('miter')
  })

  it('emits one <path> child per icon path entry', () => {
    getIconMock.mockReturnValue(fullIcon)
    const paths = [...svgOf(renderIcon('arrow-left')).children]

    expect(paths.map((path) => path.tagName.toLowerCase())).toEqual(['path', 'path'])
    expect(paths[0].getAttribute('d')).toBe('M1 1L2 2')
    expect(paths[0].getAttribute('fill-rule')).toBe('evenodd')
    expect(paths[0].getAttribute('clip-rule')).toBe('evenodd')
    expect(paths[1].getAttribute('d')).toBe('M3 3L4 4')
  })

  it('handles a single-path icon (children is the single element, not an array)', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const paths = [...svgOf(renderIcon('home')).children]
    expect(paths.map((path) => path.tagName.toLowerCase())).toEqual(['path'])
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
    const paths = [...svgOf(renderIcon('search')).children]
    expect(paths).toHaveLength(1)
    expect(paths[0].getAttribute('d')).toBe('M0 0L10 10')
    expect(paths[0].hasAttribute('fill-rule')).toBe(false)
    expect(paths[0].hasAttribute('clip-rule')).toBe(false)
  })

  it('draws a prebuilt glyph from its markup', () => {
    getIconMock.mockReturnValue({ paths: [], svg: '<circle cx="10" cy="10" r="4"></circle>' })
    const svg = svgOf(renderIcon('star'))
    expect(svg.innerHTML).toBe('<circle cx="10" cy="10" r="4"></circle>')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
  })

  it('handles an empty paths array (no path children)', () => {
    getIconMock.mockReturnValue({ paths: [] })
    expect(svgOf(renderIcon('trash')).children).toHaveLength(0)
  })
})
