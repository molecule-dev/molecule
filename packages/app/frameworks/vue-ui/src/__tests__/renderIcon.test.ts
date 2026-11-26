/**
 * Tests for utilities/renderIcon.ts — Vue port of
 * `@molecule/app-ui-react/src/__tests__/renderIcon.test.ts`: the same titles,
 * with React element fields (`type`/`key`/`props`) read off the returned Vue
 * VNode, and React's camelCase SVG props spelled the kebab-case way Vue must
 * set them as DOM attributes.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isVNode, type VNode } from 'vue'

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

/**
 * Reads a VNode's props as a plain record, failing loudly for a missing bag.
 *
 * @param vnode - The VNode to read.
 * @returns Its props (every element rendered here declares some).
 */
function propsOf(vnode: VNode): Record<string, unknown> {
  const props = vnode.props
  if (props === null || props === undefined) {
    throw new TypeError('expected a VNode with props')
  }
  return props
}

/**
 * Maps an element's children to VNodes, failing loudly when they are not the
 * array of elements `h()` produced for the icon paths.
 *
 * @param vnode - The parent VNode.
 * @returns Its children, in order.
 */
function childrenOf(vnode: VNode): VNode[] {
  const children = vnode.children
  if (!Array.isArray(children)) {
    throw new TypeError('expected an array of VNode children')
  }
  const nodes: VNode[] = []
  for (const child of children) {
    if (!isVNode(child)) throw new TypeError('expected every child to be a VNode')
    nodes.push(child)
  }
  return nodes
}

afterEach(() => {
  getIconMock.mockReset()
})

describe('renderIcon', () => {
  it('renders an <svg> React element with default viewBox + fill when icon has none', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const el = renderIcon('home')

    expect(el.type).toBe('svg')
    expect(propsOf(el).xmlns).toBe('http://www.w3.org/2000/svg')
    expect(propsOf(el).viewBox).toBe('0 0 20 20')
    expect(propsOf(el).fill).toBe('currentColor')
  })

  it('forwards className to the svg', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const el = renderIcon('home', 'w-5 h-5')
    expect(propsOf(el).class).toBe('w-5 h-5')
  })

  it('honours icon-supplied viewBox, fill, stroke, and stroke options', () => {
    getIconMock.mockReturnValue(fullIcon)
    const el = renderIcon('arrow-left')

    expect(propsOf(el).viewBox).toBe('0 0 24 24')
    expect(propsOf(el).fill).toBe('#ff0000')
    expect(propsOf(el).stroke).toBe('#000')
    // SVG attribute names are case-sensitive, so Vue sets them kebab-case;
    // the values are the ones React writes as camelCase props.
    expect(propsOf(el)['stroke-width']).toBe(2)
    expect(propsOf(el)['stroke-linecap']).toBe('round')
    expect(propsOf(el)['stroke-linejoin']).toBe('miter')
  })

  it('emits one <path> child per icon path entry', () => {
    getIconMock.mockReturnValue(fullIcon)
    const children = childrenOf(renderIcon('arrow-left'))

    expect(children).toHaveLength(2)
    expect(children[0]?.type).toBe('path')
    expect(propsOf(children[0]!).d).toBe('M1 1L2 2')
    expect(propsOf(children[0]!)['fill-rule']).toBe('evenodd')
    expect(propsOf(children[0]!)['clip-rule']).toBe('evenodd')
    expect(propsOf(children[1]!).d).toBe('M3 3L4 4')
  })

  it('handles a single-path icon (children is the single element, not an array)', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const children = childrenOf(renderIcon('home'))
    // Vue always stores element children in an array; the single path is the
    // one and only child (React collapses a single variadic child).
    expect(children).toHaveLength(1)
    expect(children[0]?.type).toBe('path')
  })

  it('looks up the icon by name via getIcon()', () => {
    getIconMock.mockReturnValue(minimalIcon)
    renderIcon('gear')
    expect(getIconMock).toHaveBeenCalledWith('gear')
  })

  it('passes a numeric React key to each path child', () => {
    getIconMock.mockReturnValue(fullIcon)
    const children = childrenOf(renderIcon('arrow-left'))
    // Vue keeps the key as the number it was given (React stringifies it).
    expect(children[0]?.key).toBe(0)
    expect(children[1]?.key).toBe(1)
  })

  it('returns a valid React element (has $$typeof symbol)', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const el = renderIcon('home')
    expect(typeof el).toBe('object')
    // Vue's own element check (`isVNode`), the counterpart of React's `$$typeof`.
    expect(isVNode(el)).toBe(true)
  })

  it('handles icons with no fillRule/clipRule on paths', () => {
    getIconMock.mockReturnValue({
      paths: [{ d: 'M0 0L10 10' }],
    })
    const children = childrenOf(renderIcon('search'))
    expect(children).toHaveLength(1)
    const single = propsOf(children[0]!)
    expect(single.d).toBe('M0 0L10 10')
    expect(single['fill-rule']).toBeUndefined()
    expect(single['clip-rule']).toBeUndefined()
  })

  it('draws a prebuilt glyph from its markup', () => {
    getIconMock.mockReturnValue({ paths: [], svg: '<circle cx="10" cy="10" r="4"></circle>' })
    const el = renderIcon('star')
    // `innerHTML` is how `h()` embeds raw markup (React's `dangerouslySetInnerHTML`).
    expect(propsOf(el).innerHTML).toBe('<circle cx="10" cy="10" r="4"></circle>')
    expect(propsOf(el)['aria-hidden']).toBe(true)
  })

  it('handles an empty paths array (no path children)', () => {
    getIconMock.mockReturnValue({ paths: [] })
    const el = renderIcon('trash')
    // `h()` with an empty children array keeps it as an empty list.
    expect(childrenOf(el)).toEqual([])
  })
})
