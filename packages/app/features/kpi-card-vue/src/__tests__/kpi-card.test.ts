// @vitest-environment jsdom
/**
 * Unit tests for the Vue KPI card primitives — a port of
 * `@molecule/app-kpi-card-react/src/__tests__/kpi-card.test.tsx`: the same
 * behavioral assertions, rendered with Vue in jsdom and asserted on the markup
 * the components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `kpiCardAccentLeft`), so tests can assert which cm.* class was applied
// without a real bond — the same mock the React tests use.
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
        // A method call carries its arguments (`fontWeight:extrabold`), so variants are assertable.
        return (...args: unknown[]) => (args.length > 0 ? `${token}:${args.join(',')}` : token)
      },
    }
    return new Proxy({}, handler)
  },
}))

import { type Component, createApp, defineComponent, h, type VNodeChild } from 'vue'

import { KpiCard } from '../KpiCard.js'
import { KpiCardGrid } from '../KpiCardGrid.js'
import { KpiCardTrend } from '../KpiCardTrend.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders one component and returns the markup it produced.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @param slots - Its slots.
 * @returns The component's markup.
 */
const html = (
  component: Component,
  props: Record<string, unknown> = {},
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
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
    const markup = html(
      KpiCardGrid,
      {},
      {
        default: () => [h('span', null, 'card-a')],
      },
    )
    expect(markup).toContain('card-a')
  })

  it('renders a single <div> wrapper', () => {
    const markup = html(KpiCardGrid, {}, { default: () => ['x'] })
    expect(markup.startsWith('<div')).toBe(true)
  })

  it('forwards className', () => {
    expect(html(KpiCardGrid, { className: 'grid-cls' }, { default: () => ['x'] })).toContain(
      'grid-cls',
    )
  })

  it('accepts custom columns + gap without throwing', () => {
    expect(() =>
      html(KpiCardGrid, { columns: 6, gap: 'lg' }, { default: () => ['x'] }),
    ).not.toThrow()
  })
})

describe('KpiCard', () => {
  it('renders title and value', () => {
    const markup = html(KpiCard, {}, { title: () => ['Revenue'], value: () => ['$1,200'] })
    expect(markup).toContain('Revenue')
    expect(markup).toContain('$1,200')
  })

  it('renders subtitle when provided', () => {
    const markup = html(
      KpiCard,
      {},
      { title: () => ['T'], value: () => ['V'], subtitle: () => ['vs last week'] },
    )
    expect(markup).toContain('vs last week')
  })

  it('omits the trend/subtitle row entirely when neither is given', () => {
    // the only spans should be inside the title row + value — no third row
    const markup = html(KpiCard, {}, { title: () => ['T'], value: () => ['V'] })
    expect(markup).not.toContain('vs last week')
  })

  it('renders icon, trend, and action slots', () => {
    const markup = html(
      KpiCard,
      {},
      {
        title: () => ['T'],
        value: () => ['V'],
        icon: () => [h('i', { 'data-slot': 'icon' })],
        trend: () => [h('span', { 'data-slot': 'trend' }, 'up')],
        action: () => [h('button', { 'data-slot': 'action' }, '...')],
      },
    )
    expect(markup).toContain('data-slot="icon"')
    expect(markup).toContain('data-slot="trend"')
    expect(markup).toContain('data-slot="action"')
  })

  it('emits a left-edge accent class when accentSide="left"', () => {
    const markup = html(KpiCard, { accentSide: 'left' }, { title: () => ['T'], value: () => ['V'] })
    expect(markup).toContain('kpiCardAccentLeft')
    expect(markup).toContain('kpiCardAccentColor')
  })

  it('emits a top-edge accent class when accentSide="top"', () => {
    const markup = html(KpiCard, { accentSide: 'top' }, { title: () => ['T'], value: () => ['V'] })
    expect(markup).toContain('kpiCardAccentTop')
  })

  it('emits no accent class by default (accentSide="none")', () => {
    const markup = html(KpiCard, {}, { title: () => ['T'], value: () => ['V'] })
    expect(markup).not.toContain('kpiCardAccentLeft')
    expect(markup).not.toContain('kpiCardAccentTop')
  })

  it('honours a custom accentColor', () => {
    const markup = html(
      KpiCard,
      { accentSide: 'left', accentColor: 'border-success' },
      { title: () => ['T'], value: () => ['V'] },
    )
    expect(markup).toContain('border-success')
  })

  it('applies the hover-lift class when hoverLift is true', () => {
    const markup = html(KpiCard, { hoverLift: true }, { title: () => ['T'], value: () => ['V'] })
    expect(markup).toContain('kpiCardHoverLift')
  })

  it('omits the hover-lift class by default', () => {
    const markup = html(KpiCard, {}, { title: () => ['T'], value: () => ['V'] })
    expect(markup).not.toContain('kpiCardHoverLift')
  })

  it('forwards data-mol-id and className onto the Card', () => {
    const markup = html(
      KpiCard,
      { dataMolId: 'kpi-revenue', className: 'card-cls' },
      { title: () => ['T'], value: () => ['V'] },
    )
    expect(markup).toContain('data-mol-id="kpi-revenue"')
    expect(markup).toContain('card-cls')
  })

  it('emits the uppercase-label styling when upperLabel is true', () => {
    const markup = html(KpiCard, { upperLabel: true }, { title: () => ['T'], value: () => ['V'] })
    expect(markup).toContain('kpiCardTitleUppercase')
  })

  it('emits the extrabold weight for the value when emphasizeValue is true', () => {
    const markup = html(
      KpiCard,
      { emphasizeValue: true },
      { title: () => ['T'], value: () => ['V'] },
    )
    expect(markup).toContain('fontWeight:extrabold')
  })
})
