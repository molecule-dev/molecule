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

const { TrendChip } = await import('../TrendChip.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('TrendChip', () => {
  it('renders an up arrow + green for a positive delta', () => {
    const markup = html(createElement(TrendChip, { delta: 12 }))
    expect(markup).toContain('▲')
    expect(markup).toContain('12%')
    expect(markup).toContain('#22c55e')
  })

  it('renders a down arrow + red for a negative delta', () => {
    const markup = html(createElement(TrendChip, { delta: -8 }))
    expect(markup).toContain('▼')
    expect(markup).toContain('8%')
    expect(markup).toContain('#ef4444')
  })

  it('renders the neutral dash for a zero delta', () => {
    const markup = html(createElement(TrendChip, { delta: 0 }))
    expect(markup).toContain('–')
    expect(markup).toContain('#94a3b8')
  })

  it('honours an explicit direction override', () => {
    const markup = html(createElement(TrendChip, { delta: 5, direction: 'down' }))
    expect(markup).toContain('▼')
  })

  it('uses the default "%" suffix and a custom suffix', () => {
    expect(html(createElement(TrendChip, { delta: 3 }))).toContain('3%')
    expect(html(createElement(TrendChip, { delta: 3, suffix: 'pts' }))).toContain('3pts')
  })

  it('renders a colored pill background for the pill variant', () => {
    const markup = html(createElement(TrendChip, { delta: 4, variant: 'pill' }))
    expect(markup).toContain('border-radius:999px')
  })

  it('honours a custom ariaLabel and forwards className', () => {
    const markup = html(
      createElement(TrendChip, { delta: 1, ariaLabel: 'Up one percent', className: 'tc-cls' }),
    )
    expect(markup).toContain('aria-label="Up one percent"')
    expect(markup).toContain('tc-cls')
  })
})
