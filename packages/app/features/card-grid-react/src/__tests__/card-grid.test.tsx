import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

const { BentoGrid } = await import('../BentoGrid.js')
const { CardGrid } = await import('../CardGrid.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('CardGrid', () => {
  it('renders its children', () => {
    const markup = html(
      createElement(CardGrid, { children: createElement('div', { 'data-card': '' }) }),
    )
    expect(markup).toContain('data-card=""')
  })

  it('forwards className', () => {
    const markup = html(createElement(CardGrid, { children: 'x', className: 'grid-cls' }))
    expect(markup).toContain('grid-cls')
  })
})

describe('BentoGrid', () => {
  const items = [
    { id: 'a', content: createElement('div', { 'data-a': '' }) },
    { id: 'b', content: createElement('div', { 'data-b': '' }) },
  ]

  it('renders each item content', () => {
    const markup = html(createElement(BentoGrid, { items }))
    expect(markup).toContain('data-a=""')
    expect(markup).toContain('data-b=""')
  })

  it('uses column-span styles in the default (non-areas) mode', () => {
    const markup = html(
      createElement(BentoGrid, {
        items: [{ id: 'a', content: 'x', colSpan: 6, rowSpan: 2 }],
      }),
    )
    expect(markup).toContain('grid-column:span 6')
    expect(markup).toContain('grid-row:span 2')
  })

  it('defaults col-span to 4 and row-span to 1 when unspecified', () => {
    const markup = html(createElement(BentoGrid, { items: [{ id: 'a', content: 'x' }] }))
    expect(markup).toContain('grid-column:span 4')
    expect(markup).toContain('grid-row:span 1')
  })

  it('uses grid-template-areas + per-item grid-area in areas mode', () => {
    const markup = html(
      createElement(BentoGrid, {
        areas: "'a a b'",
        items: [{ id: 'a', content: 'x', area: 'a' }],
      }),
    )
    expect(markup).toContain('grid-template-areas')
    expect(markup).toContain('grid-area:a')
    expect(markup).not.toContain('grid-column:span')
  })

  it('forwards className', () => {
    const markup = html(createElement(BentoGrid, { items, className: 'bento-cls' }))
    expect(markup).toContain('bento-cls')
  })
})
