import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

const { TickerRow } = await import('../TickerRow.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('TickerRow', () => {
  it('renders the symbol, name, and price', () => {
    const markup = html(
      createElement(TickerRow, { symbol: 'BTC', name: 'Bitcoin', price: '$67,000' }),
    )
    expect(markup).toContain('BTC')
    expect(markup).toContain('Bitcoin')
    expect(markup).toContain('$67,000')
  })

  it('renders an up arrow + green for a positive change', () => {
    const markup = html(createElement(TickerRow, { symbol: 'X', price: '$1', changePct: 3.21 }))
    expect(markup).toContain('▲')
    expect(markup).toContain('3.21%')
    expect(markup).toContain('#22c55e')
  })

  it('renders a down arrow + red for a negative change', () => {
    const markup = html(createElement(TickerRow, { symbol: 'X', price: '$1', changePct: -1.5 }))
    expect(markup).toContain('▼')
    expect(markup).toContain('#ef4444')
  })

  it('uses changeDisplay over the formatted percentage when supplied', () => {
    const markup = html(
      createElement(TickerRow, {
        symbol: 'X',
        price: '$1',
        changePct: 2,
        changeDisplay: '+$0.50',
      }),
    )
    expect(markup).toContain('+$0.50')
  })

  it('renders the icon, sparkline, and meta slots', () => {
    const markup = html(
      createElement(TickerRow, {
        symbol: 'X',
        price: '$1',
        icon: createElement('span', { 'data-icon': '' }),
        sparkline: createElement('svg', { 'data-spark': '' }),
        meta: createElement('span', { 'data-meta': '' }),
      }),
    )
    expect(markup).toContain('data-icon=""')
    expect(markup).toContain('data-spark=""')
    expect(markup).toContain('data-meta=""')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = html(
      createElement(TickerRow, { symbol: 'X', price: '$1', onClick: () => {} }),
    )
    expect(clickable).toContain('cursorPointer')
    const plain = html(createElement(TickerRow, { symbol: 'X', price: '$1', className: 'tr-cls' }))
    expect(plain).not.toContain('cursorPointer')
    expect(plain).toContain('tr-cls')
  })
})
