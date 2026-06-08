import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// --- bond mocks --------------------------------------------------------------
// `getClassMap()` → a Proxy where `cn(...)` joins truthy strings and every other
// access (method or token) yields a string token, so emitted classNames are
// inspectable without a wired ClassMap bond.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
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

// `<Card>` → a plain <div> that forwards className + data-mol-id + children, so
// KpiCard's wrapper is assertable.
vi.mock('@molecule/app-ui-react', () => ({
  Card: ({
    children,
    className,
    'data-mol-id': dataMolId,
  }: {
    children?: unknown
    className?: string
    'data-mol-id'?: string
  }) => createElement('div', { className, 'data-mol-id': dataMolId, 'data-card': '' }, children),
}))

const { KpiCard } = await import('../KpiCard.js')
const { KpiCardTrend } = await import('../KpiCardTrend.js')
const { KpiCardGrid } = await import('../KpiCardGrid.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('KpiCardTrend', () => {
  it('derives "up" (▲) from a positive delta', () => {
    expect(html(createElement(KpiCardTrend, { delta: 12.3 }))).toContain('▲')
  })

  it('derives "down" (▼) from a negative delta', () => {
    expect(html(createElement(KpiCardTrend, { delta: -4 }))).toContain('▼')
  })

  it('derives "flat" (–) from a zero delta', () => {
    expect(html(createElement(KpiCardTrend, { delta: 0 }))).toContain('–')
  })

  it('honours an explicit direction over the delta sign', () => {
    // positive delta but forced down
    expect(html(createElement(KpiCardTrend, { delta: 9, direction: 'down' }))).toContain('▼')
  })

  it('renders the absolute value of the delta', () => {
    expect(html(createElement(KpiCardTrend, { delta: -7.5 }))).toContain('7.5')
    expect(html(createElement(KpiCardTrend, { delta: -7.5 }))).not.toContain('-7.5')
  })

  it('defaults the suffix to "%"', () => {
    expect(html(createElement(KpiCardTrend, { delta: 3 }))).toContain('3%')
  })

  it('honours a custom suffix', () => {
    expect(html(createElement(KpiCardTrend, { delta: 3, suffix: 'pts' }))).toContain('3pts')
  })

  it('marks the arrow glyph aria-hidden', () => {
    const markup = html(createElement(KpiCardTrend, { delta: 1 }))
    expect(markup).toMatch(/<span aria-hidden="true">▲<\/span>/)
  })

  it('forwards className onto the wrapper', () => {
    expect(html(createElement(KpiCardTrend, { delta: 1, className: 'trend-cls' }))).toContain(
      'trend-cls',
    )
  })
})

describe('KpiCardGrid', () => {
  it('renders its children', () => {
    const markup = html(createElement(KpiCardGrid, null, createElement('span', null, 'card-a')))
    expect(markup).toContain('card-a')
  })

  it('renders a single <div> wrapper', () => {
    const markup = html(createElement(KpiCardGrid, null, 'x'))
    expect(markup.startsWith('<div')).toBe(true)
  })

  it('forwards className', () => {
    expect(html(createElement(KpiCardGrid, { className: 'grid-cls' }, 'x'))).toContain('grid-cls')
  })

  it('accepts custom columns + gap without throwing', () => {
    expect(() => html(createElement(KpiCardGrid, { columns: 6, gap: 'lg' }, 'x'))).not.toThrow()
  })
})

describe('KpiCard', () => {
  it('renders title and value', () => {
    const markup = html(createElement(KpiCard, { title: 'Revenue', value: '$1,200' }))
    expect(markup).toContain('Revenue')
    expect(markup).toContain('$1,200')
  })

  it('renders subtitle when provided', () => {
    const markup = html(
      createElement(KpiCard, { title: 'T', value: 'V', subtitle: 'vs last week' }),
    )
    expect(markup).toContain('vs last week')
  })

  it('omits the trend/subtitle row entirely when neither is given', () => {
    // the only spans should be inside the title row + value — no third row
    const markup = html(createElement(KpiCard, { title: 'T', value: 'V' }))
    expect(markup).not.toContain('vs last week')
  })

  it('renders icon, trend, and action slots', () => {
    const markup = html(
      createElement(KpiCard, {
        title: 'T',
        value: 'V',
        icon: createElement('i', { 'data-slot': 'icon' }),
        trend: createElement('span', { 'data-slot': 'trend' }, 'up'),
        action: createElement('button', { 'data-slot': 'action' }, '...'),
      }),
    )
    expect(markup).toContain('data-slot="icon"')
    expect(markup).toContain('data-slot="trend"')
    expect(markup).toContain('data-slot="action"')
  })

  it('emits a left-edge accent class when accentSide="left"', () => {
    const markup = html(createElement(KpiCard, { title: 'T', value: 'V', accentSide: 'left' }))
    expect(markup).toContain('border-l-4')
    expect(markup).toContain('border-primary')
  })

  it('emits a top-edge accent class when accentSide="top"', () => {
    const markup = html(createElement(KpiCard, { title: 'T', value: 'V', accentSide: 'top' }))
    expect(markup).toContain('border-t-4')
  })

  it('emits no accent class by default (accentSide="none")', () => {
    const markup = html(createElement(KpiCard, { title: 'T', value: 'V' }))
    expect(markup).not.toContain('border-l-4')
    expect(markup).not.toContain('border-t-4')
  })

  it('honours a custom accentColor', () => {
    const markup = html(
      createElement(KpiCard, {
        title: 'T',
        value: 'V',
        accentSide: 'left',
        accentColor: 'border-success',
      }),
    )
    expect(markup).toContain('border-success')
  })

  it('applies the hover-lift class when hoverLift is true', () => {
    const markup = html(createElement(KpiCard, { title: 'T', value: 'V', hoverLift: true }))
    expect(markup).toContain('hover:-translate-y-0.5')
  })

  it('omits the hover-lift class by default', () => {
    expect(html(createElement(KpiCard, { title: 'T', value: 'V' }))).not.toContain(
      'hover:-translate-y-0.5',
    )
  })

  it('forwards data-mol-id and className onto the Card', () => {
    const markup = html(
      createElement(KpiCard, {
        title: 'T',
        value: 'V',
        dataMolId: 'kpi-revenue',
        className: 'card-cls',
      }),
    )
    expect(markup).toContain('data-mol-id="kpi-revenue"')
    expect(markup).toContain('card-cls')
  })

  it('emits the uppercase-label styling when upperLabel is true', () => {
    const markup = html(createElement(KpiCard, { title: 'T', value: 'V', upperLabel: true }))
    expect(markup).toContain('uppercase tracking-widest')
  })

  it('emits font-extrabold for the value when emphasizeValue is true', () => {
    const markup = html(createElement(KpiCard, { title: 'T', value: 'V', emphasizeValue: true }))
    expect(markup).toContain('font-extrabold')
  })
})
