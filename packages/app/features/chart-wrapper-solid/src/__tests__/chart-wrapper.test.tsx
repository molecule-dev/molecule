// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ChartCard` / `ChartLegend` — a port of
 * `@molecule/app-chart-wrapper-react/src/__tests__/chart-wrapper.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with Solid
 * in jsdom and asserted on the markup the components produce.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The Card marker the React tests mock `@molecule/app-ui-react` with: a
// `data-card` element forwarding the className and the `data-mol-id` it
// received.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Card: (props: { children?: JSX.Element; className?: string; 'data-mol-id'?: string }) => (
    <div data-card="" data-mol-id={props['data-mol-id']} class={props.className}>
      {props.children}
    </div>
  ),
}))

const { ChartCard } = await import('../ChartCard.jsx')
const { ChartLegend } = await import('../ChartLegend.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('ChartCard', () => {
  it('renders the title in an <h3> and its children', () => {
    const markup = mount(() => (
      <ChartCard title="Revenue">
        <div data-chart="" />
      </ChartCard>
    )).innerHTML
    expect(markup).toContain('<h3')
    expect(markup).toContain('Revenue')
    expect(markup).toContain('data-chart=""')
  })

  it('renders description / actions / summary / footer slots when present and omits them otherwise', () => {
    const full = mount(() => (
      <ChartCard
        title="T"
        description="desc-x"
        actions={<span data-actions="" />}
        summary={<span data-summary="" />}
        footer={<span data-footer="" />}
      >
        x
      </ChartCard>
    )).innerHTML
    expect(full).toContain('desc-x')
    expect(full).toContain('data-actions=""')
    expect(full).toContain('data-summary=""')
    expect(full).toContain('data-footer=""')
    const bare = mount(() => <ChartCard title="T">x</ChartCard>).innerHTML
    expect(bare).not.toContain('data-actions')
    expect(bare).not.toContain('data-summary')
    expect(bare).not.toContain('data-footer')
    expect(bare).not.toContain('<p')
  })

  it('applies the default 240px minimum chart height', () => {
    const markup = mount(() => <ChartCard title="T">x</ChartCard>).innerHTML
    expect(markup).toContain('min-height: 240px')
  })

  it('honours a custom minChartHeight', () => {
    const markup = mount(() => (
      <ChartCard title="T" minChartHeight={400}>
        x
      </ChartCard>
    )).innerHTML
    expect(markup).toContain('min-height: 400px')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = mount(() => (
      <ChartCard title="T" dataMolId="chart-x" className="cc-cls">
        x
      </ChartCard>
    )).innerHTML
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
    const markup = mount(() => <ChartLegend items={items} />).innerHTML
    expect(markup).toContain('Series 1')
    expect(markup).toContain('Series 2')
  })

  it('renders the swatch color via inline style', () => {
    const markup = mount(() => <ChartLegend items={items} />).innerHTML
    // The DOM serializes `#f00` through the CSSOM, exactly as React's does.
    expect(markup).toContain('background: rgb(255, 0, 0)')
    expect(markup).toContain('background: rgb(0, 255, 0)')
  })

  it('renders the optional value when present', () => {
    const markup = mount(() => <ChartLegend items={items} />).innerHTML
    expect(markup).toContain('42')
  })

  it('renders plain spans (no buttons) when onToggle is absent', () => {
    const markup = mount(() => <ChartLegend items={items} />).innerHTML
    expect(markup).not.toContain('<button')
  })

  it('renders toggle buttons with aria-pressed reflecting visibility when onToggle is given', () => {
    const markup = mount(() => (
      <ChartLegend
        items={[
          { id: 's1', label: 'A', color: '#f00' },
          { id: 's2', label: 'B', color: '#0f0', hidden: true },
        ]}
        onToggle={() => {}}
      />
    )).innerHTML
    expect(markup).toContain('<button')
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain('aria-pressed="false"')
  })

  it('forwards className', () => {
    const markup = mount(() => <ChartLegend items={items} className="leg-cls" />).innerHTML
    expect(markup).toContain('leg-cls')
  })
})
