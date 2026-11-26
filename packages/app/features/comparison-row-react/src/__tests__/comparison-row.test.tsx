import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
        // Tone resolvers echo their argument, so assertions can tell which
        // semantic tone (`textTone-success`) the row picked.
        return (...args: unknown[]) => (args.length > 0 ? `${token}-${String(args[0])}` : token)
      },
    }
    return new Proxy({}, handler)
  },
}))

const { ComparisonRow } = await import('../ComparisonRow.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('ComparisonRow', () => {
  it('renders the label and current value', () => {
    const markup = html(createElement(ComparisonRow, { label: 'Revenue', current: '$12,345' }))
    expect(markup).toContain('Revenue')
    expect(markup).toContain('$12,345')
  })

  it('renders the previous value (struck through) when present and omits it otherwise', () => {
    const withPrev = html(
      createElement(ComparisonRow, { label: 'R', current: '$100', previous: '$80' }),
    )
    expect(withPrev).toContain('$80')
    expect(withPrev).toContain('line-through')
    const without = html(createElement(ComparisonRow, { label: 'R', current: '$100' }))
    expect(without).not.toContain('line-through')
  })

  it('renders an up arrow + percentage for a positive delta', () => {
    const markup = html(createElement(ComparisonRow, { label: 'R', current: '$1', deltaPct: 12.5 }))
    expect(markup).toContain('▲')
    expect(markup).toContain('12.5%')
    expect(markup).toContain('textTone-success')
    expect(markup).not.toContain('style=')
  })

  it('renders a down arrow for a negative delta', () => {
    const markup = html(createElement(ComparisonRow, { label: 'R', current: '$1', deltaPct: -8 }))
    expect(markup).toContain('▼')
    expect(markup).toContain('8.0%')
    expect(markup).toContain('textTone-error')
  })

  it('renders the neutral dash for a zero delta', () => {
    const markup = html(createElement(ComparisonRow, { label: 'R', current: '$1', deltaPct: 0 }))
    expect(markup).toContain('–')
    expect(markup).toContain('textTone-secondary')
  })

  it('uses a custom formatDelta when supplied', () => {
    const markup = html(
      createElement(ComparisonRow, {
        label: 'R',
        current: '$1',
        deltaPct: 5,
        formatDelta: (d) => createElement('span', { 'data-fmt': '' }, `delta ${d}`),
      }),
    )
    expect(markup).toContain('data-fmt=""')
    expect(markup).toContain('delta 5')
  })

  it('renders the periodLabel and forwards className', () => {
    const markup = html(
      createElement(ComparisonRow, {
        label: 'R',
        current: '$1',
        periodLabel: 'vs. last week',
        className: 'cr-cls',
      }),
    )
    expect(markup).toContain('vs. last week')
    expect(markup).toContain('cr-cls')
  })
})
