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

const { Sparkline } = await import('../Sparkline.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('Sparkline', () => {
  it('renders nothing when values is empty', () => {
    expect(html(createElement(Sparkline, { values: [] }))).toBe('')
  })

  it('renders an <svg> with role="img" and a default aria-label', () => {
    const markup = html(createElement(Sparkline, { values: [1, 2, 3] }))
    expect(markup).toContain('<svg')
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="Trend sparkline"')
  })

  it('honours a custom ariaLabel and dimensions', () => {
    const markup = html(
      createElement(Sparkline, {
        values: [1, 2],
        ariaLabel: 'Sales trend',
        width: 120,
        height: 40,
      }),
    )
    expect(markup).toContain('aria-label="Sales trend"')
    expect(markup).toContain('width="120"')
    expect(markup).toContain('height="40"')
  })

  it('renders a polyline for the line variant', () => {
    const markup = html(createElement(Sparkline, { values: [1, 5, 2], variant: 'line' }))
    expect(markup).toContain('<polyline')
  })

  it('renders rects for the bar variant', () => {
    const markup = html(createElement(Sparkline, { values: [1, 5, 2], variant: 'bar' }))
    expect(markup).toContain('<rect')
  })

  it('renders circles for the dot variant', () => {
    const markup = html(createElement(Sparkline, { values: [1, 5, 2], variant: 'dot' }))
    expect(markup).toContain('<circle')
  })

  it('applies a custom color and forwards className', () => {
    const markup = html(
      createElement(Sparkline, { values: [1, 2], color: '#ff0000', className: 'spk-cls' }),
    )
    expect(markup).toContain('#ff0000')
    expect(markup).toContain('spk-cls')
  })
})
