// @vitest-environment jsdom
/**
 * Unit tests for `ChartCard` / `ChartLegend` — the port of
 * `@molecule/app-chart-wrapper-react`'s own suite: the same test names and the
 * same behavioral assertions, rendered with a real Svelte mount (jsdom) and the
 * mocked ClassMap the React suite uses.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

import ChartCard from '../ChartCard.svelte'
import ChartLegend from '../ChartLegend.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const instances: unknown[] = []

afterEach(async () => {
  for (const instance of instances.splice(0))
    await unmount(instance as Parameters<typeof unmount>[0])
  document.body.innerHTML = ''
})

/** Mounts one component with the given props and returns the markup. */
function mountMarkup(component: unknown, props: Record<string, unknown>): string {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(component as Parameters<typeof mount>[0], {
    target,
    props: props as never,
  })
  instances.push(instance)
  flushSync()
  return target.innerHTML
}

describe('ChartCard', () => {
  it('renders the title in an <h3> and its children', () => {
    const markup = mountMarkup(ChartCard, {
      title: 'Revenue',
      children: raw('<div data-chart=""></div>'),
    })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Revenue')
    expect(markup).toContain('data-chart=""')
  })

  it('renders description / actions / summary / footer slots when present and omits them otherwise', () => {
    const full = mountMarkup(ChartCard, {
      title: 'T',
      children: raw('x'),
      description: raw('<em>desc-x</em>'),
      actions: raw('<span data-actions=""></span>'),
      summary: raw('<span data-summary=""></span>'),
      footer: raw('<span data-footer=""></span>'),
    })
    expect(full).toContain('desc-x')
    expect(full).toContain('data-actions=""')
    expect(full).toContain('data-summary=""')
    expect(full).toContain('data-footer=""')
    const bare = mountMarkup(ChartCard, { title: 'T', children: raw('x') })
    expect(bare).not.toContain('data-actions')
    expect(bare).not.toContain('data-summary')
    expect(bare).not.toContain('data-footer')
    expect(bare).not.toContain('<p')
  })

  it('applies the default 240px minimum chart height', () => {
    const markup = mountMarkup(ChartCard, { title: 'T', children: raw('x') })
    expect(markup).toContain('min-height: 240px')
  })

  it('honours a custom minChartHeight', () => {
    const markup = mountMarkup(ChartCard, { title: 'T', children: raw('x'), minChartHeight: 400 })
    expect(markup).toContain('min-height: 400px')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = mountMarkup(ChartCard, {
      title: 'T',
      children: raw('x'),
      dataMolId: 'chart-x',
      className: 'cc-cls',
    })
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
    const markup = mountMarkup(ChartLegend, { items })
    expect(markup).toContain('Series 1')
    expect(markup).toContain('Series 2')
  })

  it('renders the swatch color via inline style', () => {
    const markup = mountMarkup(ChartLegend, { items })
    // The DOM serializes `#f00` through the CSSOM, exactly as React's does.
    expect(markup).toContain('background: rgb(255, 0, 0)')
    expect(markup).toContain('background: rgb(0, 255, 0)')
  })

  it('renders the optional value when present', () => {
    const markup = mountMarkup(ChartLegend, { items })
    expect(markup).toContain('42')
  })

  it('renders plain spans (no buttons) when onToggle is absent', () => {
    const markup = mountMarkup(ChartLegend, { items })
    expect(markup).not.toContain('<button')
  })

  it('renders toggle buttons with aria-pressed reflecting visibility when onToggle is given', () => {
    const markup = mountMarkup(ChartLegend, {
      items: [
        { id: 's1', label: 'A', color: '#f00' },
        { id: 's2', label: 'B', color: '#0f0', hidden: true },
      ],
      onToggle: () => {},
    })
    expect(markup).toContain('<button')
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain('aria-pressed="false"')
  })

  it('forwards className', () => {
    const markup = mountMarkup(ChartLegend, { items, className: 'leg-cls' })
    expect(markup).toContain('leg-cls')
  })
})
