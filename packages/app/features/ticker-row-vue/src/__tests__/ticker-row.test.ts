// @vitest-environment jsdom
/**
 * Unit tests for the Vue `TickerRow` — a port of
 * `@molecule/app-ticker-row-react/src/__tests__/ticker-row.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the markup
 * the component produces. Inline colors are set through the CSSOM, so jsdom
 * serializes them as `rgb(...)` (the same values React's runtime mount
 * produces).
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

import { createApp, defineComponent, h } from 'vue'

import { TickerRow } from '../TickerRow.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link TickerRow} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(TickerRow, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('TickerRow', () => {
  it('renders the symbol, name, and price', () => {
    const markup = render({ symbol: 'BTC', name: 'Bitcoin', price: '$67,000' })
    expect(markup).toContain('BTC')
    expect(markup).toContain('Bitcoin')
    expect(markup).toContain('$67,000')
  })

  it('renders an up arrow + green for a positive change', () => {
    const markup = render({ symbol: 'X', price: '$1', changePct: 3.21 })
    expect(markup).toContain('▲')
    expect(markup).toContain('3.21%')
    expect(markup).toContain('rgb(34, 197, 94)')
  })

  it('renders a down arrow + red for a negative change', () => {
    const markup = render({ symbol: 'X', price: '$1', changePct: -1.5 })
    expect(markup).toContain('▼')
    expect(markup).toContain('rgb(239, 68, 68)')
  })

  it('uses changeDisplay over the formatted percentage when supplied', () => {
    const markup = render({ symbol: 'X', price: '$1', changePct: 2, changeDisplay: '+$0.50' })
    expect(markup).toContain('+$0.50')
  })

  it('renders the icon, sparkline, and meta slots', () => {
    const markup = render({
      symbol: 'X',
      price: '$1',
      icon: h('span', { 'data-icon': '' }),
      sparkline: h('svg', { 'data-spark': '' }),
      meta: h('span', { 'data-meta': '' }),
    })
    expect(markup).toContain('data-icon=""')
    expect(markup).toContain('data-spark=""')
    expect(markup).toContain('data-meta=""')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = render({ symbol: 'X', price: '$1', onClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    const plain = render({ symbol: 'X', price: '$1', className: 'tr-cls' })
    expect(plain).not.toContain('cursorPointer')
    expect(plain).toContain('tr-cls')
  })
})
