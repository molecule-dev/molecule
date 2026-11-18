// @vitest-environment jsdom
/**
 * Unit tests for the Svelte KPI card primitives — a port of
 * `@molecule/app-kpi-card-react/src/__tests__/kpi-card.test.tsx`: the same
 * behavioral assertions, rendered with a real Svelte mount (jsdom) and asserted
 * on the markup the components produce.
 *
 * @module
 */

import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `kpiCardAccentLeft`), so tests can assert which cm.* class was applied
// without a real bond — the same mock the React tests use.
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
        // A method call carries its arguments (`fontWeight:extrabold`), so variants are assertable.
        return (...args: unknown[]) => (args.length > 0 ? `${token}:${args.join(',')}` : token)
      },
    }
    return new Proxy({}, handler)
  },
}))

import KpiCard from '../KpiCard.svelte'
import KpiCardGrid from '../KpiCardGrid.svelte'
import KpiCardTrend from '../KpiCardTrend.svelte'

/** A snippet rendering the given markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts one component and returns the markup it produced.
 *
 * @param component - The component to mount.
 * @param props - The props to pass.
 * @returns The component's markup.
 */
const html = (component: Component<Record<string, unknown>>, props = {}): string => {
  const instance = mount(component, { target: document.body, props })
  flushSync()
  const markup = document.body.innerHTML
  unmount(instance)
  document.body.innerHTML = ''
  return markup
}

describe('KpiCardTrend', () => {
  it('derives "up" (▲) from a positive delta', () => {
    expect(html(KpiCardTrend, { delta: 12.3 })).toContain('▲')
  })

  it('derives "down" (▼) from a negative delta', () => {
    expect(html(KpiCardTrend, { delta: -4 })).toContain('▼')
  })

  it('derives "flat" (–) from a zero delta', () => {
    expect(html(KpiCardTrend, { delta: 0 })).toContain('–')
  })

  it('honours an explicit direction over the delta sign', () => {
    // positive delta but forced down
    expect(html(KpiCardTrend, { delta: 9, direction: 'down' })).toContain('▼')
  })

  it('renders the absolute value of the delta', () => {
    expect(html(KpiCardTrend, { delta: -7.5 })).toContain('7.5')
    expect(html(KpiCardTrend, { delta: -7.5 })).not.toContain('-7.5')
  })

  it('defaults the suffix to "%"', () => {
    expect(html(KpiCardTrend, { delta: 3 })).toContain('3%')
  })

  it('honours a custom suffix', () => {
    expect(html(KpiCardTrend, { delta: 3, suffix: 'pts' })).toContain('3pts')
  })

  it('marks the arrow glyph aria-hidden', () => {
    const markup = html(KpiCardTrend, { delta: 1 })
    expect(markup).toMatch(/<span aria-hidden="true">▲<\/span>/)
  })

  it('forwards className onto the wrapper', () => {
    expect(html(KpiCardTrend, { delta: 1, className: 'trend-cls' })).toContain('trend-cls')
  })
})

describe('KpiCardGrid', () => {
  it('renders its children', () => {
    const markup = html(KpiCardGrid, { children: raw('<span>card-a</span>') })
    expect(markup).toContain('card-a')
  })

  it('renders a single <div> wrapper', () => {
    const markup = html(KpiCardGrid, { children: raw('x') })
    expect(markup.startsWith('<div')).toBe(true)
  })

  it('forwards className', () => {
    expect(html(KpiCardGrid, { className: 'grid-cls', children: raw('x') })).toContain('grid-cls')
  })

  it('accepts custom columns + gap without throwing', () => {
    expect(() => html(KpiCardGrid, { columns: 6, gap: 'lg', children: raw('x') })).not.toThrow()
  })
})

describe('KpiCard', () => {
  it('renders title and value', () => {
    const markup = html(KpiCard, { title: raw('Revenue'), value: raw('$1,200') })
    expect(markup).toContain('Revenue')
    expect(markup).toContain('$1,200')
  })

  it('renders subtitle when provided', () => {
    const markup = html(KpiCard, {
      title: raw('T'),
      value: raw('V'),
      subtitle: raw('vs last week'),
    })
    expect(markup).toContain('vs last week')
  })

  it('omits the trend/subtitle row entirely when neither is given', () => {
    // the only spans should be inside the title row + value — no third row
    const markup = html(KpiCard, { title: raw('T'), value: raw('V') })
    expect(markup).not.toContain('vs last week')
  })

  it('renders icon, trend, and action slots', () => {
    const markup = html(KpiCard, {
      title: raw('T'),
      value: raw('V'),
      icon: raw('<i data-slot="icon"></i>'),
      trend: raw('<span data-slot="trend">up</span>'),
      action: raw('<button data-slot="action">...</button>'),
    })
    expect(markup).toContain('data-slot="icon"')
    expect(markup).toContain('data-slot="trend"')
    expect(markup).toContain('data-slot="action"')
  })

  it('emits a left-edge accent class when accentSide="left"', () => {
    const markup = html(KpiCard, { title: raw('T'), value: raw('V'), accentSide: 'left' })
    expect(markup).toContain('kpiCardAccentLeft')
    expect(markup).toContain('kpiCardAccentColor')
  })

  it('emits a top-edge accent class when accentSide="top"', () => {
    const markup = html(KpiCard, { title: raw('T'), value: raw('V'), accentSide: 'top' })
    expect(markup).toContain('kpiCardAccentTop')
  })

  it('emits no accent class by default (accentSide="none")', () => {
    const markup = html(KpiCard, { title: raw('T'), value: raw('V') })
    expect(markup).not.toContain('kpiCardAccentLeft')
    expect(markup).not.toContain('kpiCardAccentTop')
  })

  it('honours a custom accentColor', () => {
    const markup = html(KpiCard, {
      title: raw('T'),
      value: raw('V'),
      accentSide: 'left',
      accentColor: 'border-success',
    })
    expect(markup).toContain('border-success')
  })

  it('applies the hover-lift class when hoverLift is true', () => {
    const markup = html(KpiCard, { title: raw('T'), value: raw('V'), hoverLift: true })
    expect(markup).toContain('kpiCardHoverLift')
  })

  it('omits the hover-lift class by default', () => {
    expect(html(KpiCard, { title: raw('T'), value: raw('V') })).not.toContain('kpiCardHoverLift')
  })

  it('forwards data-mol-id and className onto the Card', () => {
    const markup = html(KpiCard, {
      title: raw('T'),
      value: raw('V'),
      dataMolId: 'kpi-revenue',
      className: 'card-cls',
    })
    expect(markup).toContain('data-mol-id="kpi-revenue"')
    expect(markup).toContain('card-cls')
  })

  it('emits the uppercase-label styling when upperLabel is true', () => {
    const markup = html(KpiCard, { title: raw('T'), value: raw('V'), upperLabel: true })
    expect(markup).toContain('kpiCardTitleUppercase')
  })

  it('emits the extrabold weight for the value when emphasizeValue is true', () => {
    const markup = html(KpiCard, { title: raw('T'), value: raw('V'), emphasizeValue: true })
    expect(markup).toContain('fontWeight:extrabold')
  })
})
