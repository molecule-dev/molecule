// @vitest-environment jsdom
/**
 * Unit tests for the Solid `CardGrid` and `BentoGrid` — a port of
 * `@molecule/app-card-grid-react/src/__tests__/card-grid.test.tsx`: the same
 * behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the components produce.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.grid({...})`). `cn(...)` joins tokens, calling
// any function-valued args first.
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

const { BentoGrid } = await import('../BentoGrid.jsx')
const { CardGrid } = await import('../CardGrid.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container.innerHTML
}

describe('CardGrid', () => {
  it('renders its children', () => {
    const markup = mount(() => (
      <CardGrid>
        <div data-card="" />
      </CardGrid>
    ))
    expect(markup).toContain('data-card=""')
  })

  it('forwards className', () => {
    const markup = mount(() => <CardGrid className="grid-cls">x</CardGrid>)
    expect(markup).toContain('grid-cls')
  })
})

describe('BentoGrid', () => {
  const items = [
    { id: 'a', content: <div data-a="" /> },
    { id: 'b', content: <div data-b="" /> },
  ]

  it('renders each item content', () => {
    const markup = mount(() => <BentoGrid items={items} />)
    expect(markup).toContain('data-a=""')
    expect(markup).toContain('data-b=""')
  })

  it('uses column-span styles in the default (non-areas) mode', () => {
    const markup = mount(() => (
      <BentoGrid items={[{ id: 'a', content: 'x', colSpan: 6, rowSpan: 2 }]} />
    ))
    expect(markup).toContain('grid-column: span 6')
    expect(markup).toContain('grid-row: span 2')
  })

  it('defaults col-span to 4 and row-span to 1 when unspecified', () => {
    const markup = mount(() => <BentoGrid items={[{ id: 'a', content: 'x' }]} />)
    expect(markup).toContain('grid-column: span 4')
    expect(markup).toContain('grid-row: span 1')
  })

  it('uses grid-template-areas + per-item grid-area in areas mode', () => {
    const markup = mount(() => (
      <BentoGrid areas="'a a b'" items={[{ id: 'a', content: 'x', area: 'a' }]} />
    ))
    expect(markup).toContain('grid-template-areas')
    expect(markup).toContain('grid-area: a')
    expect(markup).not.toContain('grid-column: span')
  })

  it('forwards className', () => {
    const markup = mount(() => <BentoGrid items={items} className="bento-cls" />)
    expect(markup).toContain('bento-cls')
  })
})
