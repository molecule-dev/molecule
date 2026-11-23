// @vitest-environment jsdom
/**
 * `renderIcon` for Angular — a port of
 * `@molecule/app-ui-react/src/__tests__/renderIcon.test.ts`.
 *
 * Angular has no element-descriptor value to inspect: the package's renderer
 * is `resolveIcon()` (the icon data plus its class and geometry) consumed by
 * the `svg[mol-icon]` component, which IS the `<svg>` element. So the React
 * reference's `element.type` / `element.props` assertions become assertions
 * about the rendered `<svg>` node: same icon data, same `getIcon` call, same
 * expected attribute values.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ComponentFixture, TestBed } from '@angular/core/testing'
import { platformBrowser } from '@angular/platform-browser'
import { BrowserTestingModule } from '@angular/platform-browser/testing'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import type { IconData, IconName } from '@molecule/app-icons'

import type { ResolvedIcon } from '../utilities/render-icon.js'

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn(),
}))

const { getIcon } = await import('@molecule/app-icons')

const { MolIconSvg, resolveIcon } = await import('../utilities/render-icon.js')

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

/** What the icon host exposes to a test. */
interface IconHostInstance {
  /** The resolved icon data the svg renders. */
  icon?: ResolvedIcon
}

/** Host that mounts the icon svg with the data resolved for a name. */
const IconHost: Type<IconHostInstance> = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-spec-icon-host',
  standalone: true,
  imports: [MolIconSvg],
  template: `<svg mol-icon [data]="icon"></svg>`,
})(
  class SpecIconHost implements IconHostInstance {
    /** The resolved icon data the svg renders. */
    icon?: ResolvedIcon
  },
)

/** The `<svg>` inside a mounted host, failing loudly when it is not there. */
function svgOf(fixture: ComponentFixture<IconHostInstance>): SVGSVGElement {
  const svg = fixture.nativeElement.querySelector('svg')
  if (!(svg instanceof SVGSVGElement)) throw new TypeError('expected renderIcon to render an <svg>')
  return svg
}

/**
 * Mounts the icon svg for a name (and optional class) and returns the svg.
 *
 * @param name - The icon name to render.
 * @param className - The class handed to the svg.
 * @returns The rendered svg element.
 */
function mountIcon(name: IconName, className?: string): SVGSVGElement {
  TestBed.configureTestingModule({
    imports: [IconHost],
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const fixture = TestBed.createComponent(IconHost)
  fixture.componentInstance.icon = resolveIcon(name, className)
  fixture.detectChanges()
  return svgOf(fixture)
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

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowser())
})

afterAll(() => {
  TestBed.resetTestEnvironment()
})

afterEach(() => {
  TestBed.resetTestingModule()
  getIconMock.mockReset()
  document.body.innerHTML = ''
})

describe('renderIcon', () => {
  it('renders an <svg> React element with default viewBox + fill when icon has none', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const svg = mountIcon('home')

    expect(svg.tagName).toBe('svg')
    expect(svg.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg')
    expect(svg.getAttribute('viewBox')).toBe('0 0 20 20')
    expect(svg.getAttribute('fill')).toBe('currentColor')
  })

  it('forwards className to the svg', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const svg = mountIcon('home', 'w-5 h-5')
    // Angular's class binding stores a class SET and serializes it sorted;
    // class order carries no meaning, so the assertion is the same set of
    // tokens React writes verbatim.
    expect(svg.getAttribute('class')?.split(/\s+/).sort()).toEqual(['h-5', 'w-5'])
  })

  it('honours icon-supplied viewBox, fill, stroke, and stroke options', () => {
    getIconMock.mockReturnValue(fullIcon)
    const svg = mountIcon('arrow-left')

    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg.getAttribute('fill')).toBe('#ff0000')
    expect(svg.getAttribute('stroke')).toBe('#000')
    expect(svg.getAttribute('stroke-width')).toBe('2')
    expect(svg.getAttribute('stroke-linecap')).toBe('round')
    expect(svg.getAttribute('stroke-linejoin')).toBe('miter')
  })

  it('emits one <path> child per icon path entry', () => {
    getIconMock.mockReturnValue(fullIcon)
    const paths = pathsOf(mountIcon('arrow-left'))

    expect(paths).toHaveLength(2)
    expect(paths[0].tagName).toBe('path')
    expect(paths[0].getAttribute('d')).toBe('M1 1L2 2')
    expect(paths[0].getAttribute('fill-rule')).toBe('evenodd')
    expect(paths[0].getAttribute('clip-rule')).toBe('evenodd')
    expect(paths[1].getAttribute('d')).toBe('M3 3L4 4')
  })

  it('handles a single-path icon (children is the single element, not an array)', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const svg = mountIcon('home')
    // The icon has one path, so the svg carries exactly one element child.
    const children = Array.from(svg.children)
    expect(children).toHaveLength(1)
    expect(children[0].tagName).toBe('path')
  })

  it('looks up the icon by name via getIcon()', () => {
    getIconMock.mockReturnValue(minimalIcon)
    mountIcon('gear')
    expect(getIconMock).toHaveBeenCalledWith('gear')
  })

  it('passes a numeric React key to each path child', () => {
    getIconMock.mockReturnValue(fullIcon)
    const paths = pathsOf(mountIcon('arrow-left'))
    // Angular tracks `@for` by index: the observable equivalent is that every
    // path entry renders its own `<path>` node, in the icon's order.
    expect(paths).toHaveLength(2)
    expect(paths[0]).not.toBe(paths[1])
    expect(paths.map((path) => path.getAttribute('d'))).toEqual(['M1 1L2 2', 'M3 3L4 4'])
  })

  it('returns a valid React element (has $$typeof symbol)', () => {
    getIconMock.mockReturnValue(minimalIcon)
    const svg: unknown = mountIcon('home')
    // Angular's renderer returns no descriptor: the mounted result is the real
    // svg element (the counterpart of React's valid-element check).
    expect(typeof svg).toBe('object')
    expect(svg instanceof SVGSVGElement).toBe(true)
  })

  it('handles icons with no fillRule/clipRule on paths', () => {
    getIconMock.mockReturnValue({
      paths: [{ d: 'M0 0L10 10' }],
    })
    const children = Array.from(mountIcon('search').children)
    expect(children).toHaveLength(1)
    expect(children[0].getAttribute('d')).toBe('M0 0L10 10')
    expect(children[0].getAttribute('fill-rule')).toBeNull()
    expect(children[0].getAttribute('clip-rule')).toBeNull()
  })

  it('handles an empty paths array (no path children)', () => {
    getIconMock.mockReturnValue({ paths: [] })
    const svg = mountIcon('trash')
    // Nothing to render: the svg is created with no children at all.
    expect(svg.children).toHaveLength(0)
    expect(pathsOf(svg)).toHaveLength(0)
  })
})
