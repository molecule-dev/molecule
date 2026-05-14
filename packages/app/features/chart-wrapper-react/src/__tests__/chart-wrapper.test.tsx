import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: `cn(...)` joins tokens, calling function-valued
// args first so bare property tokens survive.
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

// `Card` is the only `@molecule/app-ui-react` dependency — stub it to a
// <div data-card> that forwards data-mol-id + className + children.
vi.mock('@molecule/app-ui-react', () => ({
  Card: ({
    children,
    className,
    ['data-mol-id']: molId,
  }: {
    children?: ReactNode
    className?: string
    'data-mol-id'?: string
  }) => createElement('div', { 'data-card': '', 'data-mol-id': molId, className }, children),
}))

const { ChartCard } = await import('../ChartCard.js')
const { ChartLegend } = await import('../ChartLegend.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('ChartCard', () => {
  it('renders the title in an <h3> and its children', () => {
    const markup = html(
      createElement(ChartCard, {
        title: 'Revenue',
        children: createElement('div', { 'data-chart': '' }),
      }),
    )
    expect(markup).toContain('<h3')
    expect(markup).toContain('Revenue')
    expect(markup).toContain('data-chart=""')
  })

  it('renders description / actions / summary / footer slots when present and omits them otherwise', () => {
    const full = html(
      createElement(ChartCard, {
        title: 'T',
        children: 'x',
        description: 'desc-x',
        actions: createElement('span', { 'data-actions': '' }),
        summary: createElement('span', { 'data-summary': '' }),
        footer: createElement('span', { 'data-footer': '' }),
      }),
    )
    expect(full).toContain('desc-x')
    expect(full).toContain('data-actions=""')
    expect(full).toContain('data-summary=""')
    expect(full).toContain('data-footer=""')
    const bare = html(createElement(ChartCard, { title: 'T', children: 'x' }))
    expect(bare).not.toContain('data-actions')
    expect(bare).not.toContain('data-summary')
    expect(bare).not.toContain('data-footer')
    expect(bare).not.toContain('<p')
  })

  it('applies the default 240px minimum chart height', () => {
    const markup = html(createElement(ChartCard, { title: 'T', children: 'x' }))
    expect(markup).toContain('min-height:240px')
  })

  it('honours a custom minChartHeight', () => {
    const markup = html(
      createElement(ChartCard, { title: 'T', children: 'x', minChartHeight: 400 }),
    )
    expect(markup).toContain('min-height:400px')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = html(
      createElement(ChartCard, {
        title: 'T',
        children: 'x',
        dataMolId: 'chart-x',
        className: 'cc-cls',
      }),
    )
    expect(markup).toContain('data-mol-id="chart-x"')
    expect(markup).toContain('cc-cls')
  })
})

describe('ChartLegend', () => {
  const items = [
    { id: 's1', label: 'Series 1', color: '#f00' },
    { id: 's2', label: 'Series 2', color: '#0f0', value: '42' },
  ]

  it('renders every series label', () => {
    const markup = html(createElement(ChartLegend, { items }))
    expect(markup).toContain('Series 1')
    expect(markup).toContain('Series 2')
  })

  it('renders the swatch color via inline style', () => {
    const markup = html(createElement(ChartLegend, { items }))
    expect(markup).toContain('background:#f00')
    expect(markup).toContain('background:#0f0')
  })

  it('renders the optional value when present', () => {
    const markup = html(createElement(ChartLegend, { items }))
    expect(markup).toContain('42')
  })

  it('renders plain spans (no buttons) when onToggle is absent', () => {
    const markup = html(createElement(ChartLegend, { items }))
    expect(markup).not.toContain('<button')
  })

  it('renders toggle buttons with aria-pressed reflecting visibility when onToggle is given', () => {
    const markup = html(
      createElement(ChartLegend, {
        items: [
          { id: 's1', label: 'A', color: '#f00' },
          { id: 's2', label: 'B', color: '#0f0', hidden: true },
        ],
        onToggle: () => {},
      }),
    )
    expect(markup).toContain('<button')
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain('aria-pressed="false"')
  })

  it('forwards className', () => {
    const markup = html(createElement(ChartLegend, { items, className: 'leg-cls' }))
    expect(markup).toContain('leg-cls')
  })
})
