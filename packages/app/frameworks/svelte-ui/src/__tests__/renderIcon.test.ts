// @vitest-environment jsdom
/**
 * Tests for `components/IconGlyph.svelte` — the Svelte counterpart of
 * `@molecule/app-ui-react/src/utilities/renderIcon.ts`, ported from
 * `@molecule/app-ui-react/src/__tests__/renderIcon.test.ts` with the same
 * titles: the React helper returns an element descriptor, so its assertions
 * read `element.type`/`element.props`; Svelte renders the `<svg>` inside a
 * component, so the same inputs and expected values are read from the
 * rendered DOM node's attributes and children instead.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: vi.fn(),
}))

import { flushSync, mount, unmount } from 'svelte'

import type { IconData, IconName } from '@molecule/app-icons'
import { getIcon } from '@molecule/app-icons'

const { default: IconGlyph } = await import('../components/IconGlyph.svelte')

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

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
  getIconMock.mockReset()
})

/**
 * Mounts an `IconGlyph` and returns the `<svg>` it rendered.
 *
 * @param name - The icon name to render.
 * @param className - The CSS class handed to the svg.
 * @returns The rendered svg element.
 */
function mountedIcon(name: IconName, className?: string): SVGSVGElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(mount(IconGlyph, { target: host, props: { name, className } }))
  flushSync()
  const svg = host.querySelector('svg')
  if (!svg) throw new Error('expected the icon to render an <svg>')
  return svg
}

/**
 * The `<path>` elements inside an icon svg, in DOM order.
 *
 * @param svg - The rendered icon.
 * @returns Its path children.
 */
function pathsOf(svg: SVGSVGElement): SVGPathElement[] {
  return Array.from(svg.querySelectorAll<SVGPathElement>('path'))
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
    // SVG attributes are kebab-case in the DOM; the values are the ones React
    // writes as camelCase props.
    expect(svg.getAttribute('stroke-width')).toBe('2')
    expect(svg.getAttribute('stroke-linecap')).toBe('round')
    expect(svg.getAttribute('stroke-linejoin')).toBe('miter')
  })

  it('emits one <path> child per icon path entry', () => {
    getIconMock.mockReturnValue(fullIcon)
    const paths = pathsOf(mountedIcon('arrow-left'))

    expect(paths).toHaveLength(2)
    expect(paths[0]!.tagName).toBe('path')
    expect(paths[0]!.getAttribute('d')).toBe('M1 1L2 2')
    expect(paths[0]!.getAttribute('fill-rule')).toBe('evenodd')
    expect(paths[0]!.getAttribute('clip-rule')).toBe('evenodd')
    expect(paths[1]!.getAttribute('d')).toBe('M3 3L4 4')
  })

  it('handles a single-path icon (children is the single element, not an array)', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const svg = mountedIcon('home')
    // The icon has one path, so the svg carries exactly one element child —
    // the framework's counterpart of React's collapsed single variadic child.
    const children = Array.from(svg.children)
    expect(children).toHaveLength(1)
    expect(children[0]!.tagName).toBe('path')
  })

  it('looks up the icon by name via getIcon()', () => {
    getIconMock.mockReturnValue(minimalIcon)
    mountedIcon('gear')
    expect(getIconMock).toHaveBeenCalledWith('gear')
  })

  it('passes a numeric React key to each path child', () => {
    getIconMock.mockReturnValue(fullIcon)
    const paths = pathsOf(mountedIcon('arrow-left'))
    // Svelte keys the `{#each}` block by index; the observable equivalent of
    // React's per-child key is that every path entry renders its own `<path>`
    // node, in the icon's order.
    expect(paths).toHaveLength(2)
    expect(paths[0]).not.toBe(paths[1])
    expect(paths.map((path) => path.getAttribute('d'))).toEqual(['M1 1L2 2', 'M3 3L4 4'])
  })

  it('returns a valid React element (has $$typeof symbol)', () => {
    getIconMock.mockReturnValue(minimalIcon)
    // Svelte templates are not element descriptors: the value the caller
    // gets is the rendered `<svg>` itself, so validity is its DOM type.
    const svg = mountedIcon('home')
    expect(svg).toBeInstanceOf(SVGElement)
    expect(svg.tagName).toBe('svg')
  })

  it('handles icons with no fillRule/clipRule on paths', () => {
    getIconMock.mockReturnValue({
      paths: [{ d: 'M0 0L10 10' }],
    })
    const children = Array.from(mountedIcon('search').children)
    expect(children).toHaveLength(1)
    expect(children[0]!.getAttribute('d')).toBe('M0 0L10 10')
    expect(children[0]!.getAttribute('fill-rule')).toBeNull()
    expect(children[0]!.getAttribute('clip-rule')).toBeNull()
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
    // Nothing to render: the svg is created with no path children at all.
    expect(svg.children).toHaveLength(0)
    expect(pathsOf(svg)).toHaveLength(0)
  })
})
