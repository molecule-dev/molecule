// @vitest-environment jsdom
/**
 * `renderIcon` builds the SVG through Solid's JSX, so the reference test's
 * element-descriptor assertions become assertions about the DOM node the
 * caller receives: the React reference reads `element.type`/`element.props`,
 * this port reads the rendered attributes and children. Same icon data, same
 * `getIcon` call, same expected values.
 *
 * @module
 */
import { createRoot } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { IconData, IconName } from '@molecule/app-icons'

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: vi.fn(),
}))

const { getIcon } = await import('@molecule/app-icons')

const { renderIcon } = await import('../utilities/renderIcon.jsx')

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

const disposers: Array<() => void> = []

afterEach(() => {
  getIconMock.mockReset()
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Whether a value is a rendered `<svg>` node. */
function isSvgElement(value: unknown): value is SVGSVGElement {
  return value instanceof SVGSVGElement
}

/**
 * Mounts `renderIcon(...)` and returns the `<svg>` it rendered.
 *
 * @param name - The icon name to render.
 * @param className - The CSS class handed to the svg.
 * @returns The rendered svg element.
 */
function mountedIcon(name: IconName, className?: string): SVGSVGElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => renderIcon(name, className), container))
  const svg = container.querySelector('svg')
  if (!svg) throw new Error('expected renderIcon to render an <svg>')
  return svg
}

/**
 * The `<path>` elements inside an icon svg, in DOM order.
 *
 * @param svg - The rendered icon.
 * @returns Its path children.
 */
function pathsOf(svg: SVGSVGElement): SVGPathElement[] {
  return Array.from(svg.querySelectorAll('path'))
}

describe('renderIcon', () => {
  it('renders an <svg> React element with default viewBox + fill when icon has none', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const svg = mountedIcon('home')

    expect(svg.tagName).toBe('svg')
    expect(svg.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg')
    expect(svg.getAttribute('viewBox')).toBe('0 0 20 20')
    expect(svg.getAttribute('fill')).toBe('currentColor')
  })

  it('forwards className to the svg', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const svg = mountedIcon('home', 'w-5 h-5')
    expect(svg.getAttribute('class')).toBe('w-5 h-5')
  })

  it('honours icon-supplied viewBox, fill, stroke, and stroke options', () => {
    getIconMock.mockReturnValue(fullIcon)
    const svg = mountedIcon('arrow-left')

    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg.getAttribute('fill')).toBe('#ff0000')
    expect(svg.getAttribute('stroke')).toBe('#000')
    expect(svg.getAttribute('stroke-width')).toBe('2')
    expect(svg.getAttribute('stroke-linecap')).toBe('round')
    expect(svg.getAttribute('stroke-linejoin')).toBe('miter')
  })

  it('emits one <path> child per icon path entry', () => {
    getIconMock.mockReturnValue(fullIcon)
    const paths = pathsOf(mountedIcon('arrow-left'))

    expect(paths).toHaveLength(2)
    expect(paths[0].tagName).toBe('path')
    expect(paths[0].getAttribute('d')).toBe('M1 1L2 2')
    expect(paths[0].getAttribute('fill-rule')).toBe('evenodd')
    expect(paths[0].getAttribute('clip-rule')).toBe('evenodd')
    expect(paths[1].getAttribute('d')).toBe('M3 3L4 4')
  })

  it('handles a single-path icon (children is the single element, not an array)', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const svg = mountedIcon('home')
    // The icon has one path, so the svg carries exactly one element child.
    const children = Array.from(svg.children)
    expect(children).toHaveLength(1)
    expect(children[0].tagName).toBe('path')
  })

  it('looks up the icon by name via getIcon()', () => {
    getIconMock.mockReturnValue(minimalIcon)
    mountedIcon('gear')
    expect(getIconMock).toHaveBeenCalledWith('gear')
  })

  it('passes a numeric React key to each path child', () => {
    getIconMock.mockReturnValue(fullIcon)
    const paths = pathsOf(mountedIcon('arrow-left'))
    // Solid has no element keys: the observable equivalent is that every path
    // entry renders its own `<path>` node, in the icon's order.
    expect(paths).toHaveLength(2)
    expect(paths[0]).not.toBe(paths[1])
    expect(paths.map((path) => path.getAttribute('d'))).toEqual(['M1 1L2 2', 'M3 3L4 4'])
  })

  it('returns a valid React element (has $$typeof symbol)', () => {
    getIconMock.mockReturnValue(minimalIcon)
    let dispose = (): void => {}
    const element: unknown = createRoot((rootDispose) => {
      dispose = rootDispose
      return renderIcon('home')
    })
    try {
      // Solid's JSX is a real DOM node, not an element descriptor: the value
      // the caller receives is the `<svg>` itself.
      expect(typeof element).toBe('object')
      expect(isSvgElement(element)).toBe(true)
      if (!isSvgElement(element)) throw new Error('expected an svg element')
      expect(element.tagName).toBe('svg')
    } finally {
      dispose()
    }
  })

  it('handles icons with no fillRule/clipRule on paths', () => {
    getIconMock.mockReturnValue({
      paths: [{ d: 'M0 0L10 10' }],
    })
    const children = Array.from(mountedIcon('search').children)
    expect(children).toHaveLength(1)
    expect(children[0].getAttribute('d')).toBe('M0 0L10 10')
    expect(children[0].getAttribute('fill-rule')).toBeNull()
    expect(children[0].getAttribute('clip-rule')).toBeNull()
  })

  it('draws a prebuilt glyph from its markup', () => {
    getIconMock.mockReturnValue({ paths: [], svg: '<circle cx="10" cy="10" r="4"></circle>' })
    const svg = mountedIcon('star')
    expect(svg.innerHTML).toBe('<circle cx="10" cy="10" r="4"></circle>')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
  })

  it('handles an empty paths array (no path children)', () => {
    getIconMock.mockReturnValue({ paths: [] })
    const svg = mountedIcon('trash')
    // Nothing to render: the svg is created with no children at all.
    expect(svg.children).toHaveLength(0)
    expect(pathsOf(svg)).toHaveLength(0)
  })
})
