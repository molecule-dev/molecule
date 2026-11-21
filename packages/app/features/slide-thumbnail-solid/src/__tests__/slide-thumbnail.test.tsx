// @vitest-environment jsdom
/**
 * Unit tests for the Solid `SlideThumbnail` — a port of
 * `@molecule/app-slide-thumbnail-react/src/__tests__/slide-thumbnail.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { inlineStyleMismatch } from '@molecule/app-framework-conformance/ui'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `position`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { SlideThumbnail } = await import('../SlideThumbnail.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Renders a view with Solid's browser renderer and returns the container. */
const mount = (view: () => JSX.Element): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('SlideThumbnail', () => {
  it('renders a button labelled with the slide index', () => {
    const markup = mount(() => <SlideThumbnail index={4} />).innerHTML
    expect(markup.startsWith('<button')).toBe(true)
    expect(markup).toContain('aria-label="Slide 4"')
    expect(markup).toContain('>4<')
  })

  it('renders the live-preview children', () => {
    const markup = mount(() => (
      <SlideThumbnail index={1}>
        <div data-preview="" />
      </SlideThumbnail>
    )).innerHTML
    expect(markup).toContain('data-preview=""')
  })

  it('applies an active outline + aria-current only when active', () => {
    const active = mount(() => <SlideThumbnail index={1} active />).innerHTML
    expect(active).toContain('aria-current="true"')
    expect(inlineStyleMismatch(active, { outline: '2px solid currentColor' })).toBeNull()
    const inactive = mount(() => <SlideThumbnail index={1} />).innerHTML
    expect(inactive).not.toContain('aria-current="true"')
  })

  it('locks the aspect ratio via inline style (default 16/9)', () => {
    expect(mount(() => <SlideThumbnail index={1} />).innerHTML).toContain('aspect-ratio: 16 / 9')
    expect(mount(() => <SlideThumbnail index={1} aspect="4/3" />).innerHTML).toContain(
      'aspect-ratio: 4 / 3',
    )
  })

  it('sizes the tile from the width prop (default 160)', () => {
    expect(mount(() => <SlideThumbnail index={1} />).innerHTML).toContain('width: 160px')
    expect(mount(() => <SlideThumbnail index={1} width={240} />).innerHTML).toContain(
      'width: 240px',
    )
  })

  it('forwards className', () => {
    const markup = mount(() => <SlideThumbnail index={1} className="st-cls" />).innerHTML
    expect(markup).toContain('st-cls')
  })
})
