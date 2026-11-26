// @vitest-environment jsdom
/**
 * Unit tests for the Solid KPI card primitives — a port of
 * `@molecule/app-kpi-card-react/src/__tests__/kpi-card.test.tsx`: the same
 * behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the components produce.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

const { KpiCard } = await import('../KpiCard.jsx')
const { KpiCardGrid } = await import('../KpiCardGrid.jsx')
const { KpiCardTrend } = await import('../KpiCardTrend.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders one component with Solid's browser renderer and disposes it afterwards.
 *
 * @param view - The view to render.
 * @returns The container the view rendered into.
 */
const mount = (view: () => JSX.Element): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('KpiCardTrend', () => {
  it('derives "up" (▲) from a positive delta', () => {
    expect(mount(() => <KpiCardTrend delta={12.3} />).innerHTML).toContain('▲')
  })

  it('derives "down" (▼) from a negative delta', () => {
    expect(mount(() => <KpiCardTrend delta={-4} />).innerHTML).toContain('▼')
  })

  it('derives "flat" (–) from a zero delta', () => {
    expect(mount(() => <KpiCardTrend delta={0} />).innerHTML).toContain('–')
  })

  it('honours an explicit direction over the delta sign', () => {
    // positive delta but forced down
    expect(mount(() => <KpiCardTrend delta={9} direction="down" />).innerHTML).toContain('▼')
  })

  it('renders the absolute value of the delta', () => {
    expect(mount(() => <KpiCardTrend delta={-7.5} />).innerHTML).toContain('7.5')
    expect(mount(() => <KpiCardTrend delta={-7.5} />).innerHTML).not.toContain('-7.5')
  })

  it('defaults the suffix to "%"', () => {
    expect(mount(() => <KpiCardTrend delta={3} />).innerHTML).toContain('3%')
  })

  it('honours a custom suffix', () => {
    expect(mount(() => <KpiCardTrend delta={3} suffix="pts" />).innerHTML).toContain('3pts')
  })

  it('marks the arrow glyph aria-hidden', () => {
    const markup = mount(() => <KpiCardTrend delta={1} />).innerHTML
    expect(markup).toMatch(/<span aria-hidden="true">▲<\/span>/)
  })

  it('forwards className onto the wrapper', () => {
    expect(mount(() => <KpiCardTrend delta={1} className="trend-cls" />).innerHTML).toContain(
      'trend-cls',
    )
  })
})

describe('KpiCardGrid', () => {
  it('renders its children', () => {
    const markup = mount(() => (
      <KpiCardGrid>
        <span>card-a</span>
      </KpiCardGrid>
    )).innerHTML
    expect(markup).toContain('card-a')
  })

  it('renders a single <div> wrapper', () => {
    const markup = mount(() => <KpiCardGrid>x</KpiCardGrid>).innerHTML
    expect(markup.startsWith('<div')).toBe(true)
  })

  it('forwards className', () => {
    expect(mount(() => <KpiCardGrid className="grid-cls">x</KpiCardGrid>).innerHTML).toContain(
      'grid-cls',
    )
  })

  it('accepts custom columns + gap without throwing', () => {
    expect(() =>
      mount(() => (
        <KpiCardGrid columns={6} gap="lg">
          x
        </KpiCardGrid>
      )),
    ).not.toThrow()
  })
})

describe('KpiCard', () => {
  it('renders title and value', () => {
    const markup = mount(() => <KpiCard title="Revenue" value="$1,200" />).innerHTML
    expect(markup).toContain('Revenue')
    expect(markup).toContain('$1,200')
  })

  it('renders subtitle when provided', () => {
    const markup = mount(() => <KpiCard title="T" value="V" subtitle="vs last week" />).innerHTML
    expect(markup).toContain('vs last week')
  })

  it('omits the trend/subtitle row entirely when neither is given', () => {
    // the only spans should be inside the title row + value — no third row
    const markup = mount(() => <KpiCard title="T" value="V" />).innerHTML
    expect(markup).not.toContain('vs last week')
  })

  it('renders icon, trend, and action slots', () => {
    const markup = mount(() => (
      <KpiCard
        title="T"
        value="V"
        icon={<i data-slot="icon" />}
        trend={<span data-slot="trend">up</span>}
        action={<button data-slot="action">...</button>}
      />
    )).innerHTML
    expect(markup).toContain('data-slot="icon"')
    expect(markup).toContain('data-slot="trend"')
    expect(markup).toContain('data-slot="action"')
  })

  it('emits a left-edge accent class when accentSide="left"', () => {
    const markup = mount(() => <KpiCard title="T" value="V" accentSide="left" />).innerHTML
    expect(markup).toContain('kpiCardAccentLeft')
    expect(markup).toContain('kpiCardAccentColor')
  })

  it('emits a top-edge accent class when accentSide="top"', () => {
    const markup = mount(() => <KpiCard title="T" value="V" accentSide="top" />).innerHTML
    expect(markup).toContain('kpiCardAccentTop')
  })

  it('emits no accent class by default (accentSide="none")', () => {
    const markup = mount(() => <KpiCard title="T" value="V" />).innerHTML
    expect(markup).not.toContain('kpiCardAccentLeft')
    expect(markup).not.toContain('kpiCardAccentTop')
  })

  it('honours a custom accentColor', () => {
    const markup = mount(() => (
      <KpiCard title="T" value="V" accentSide="left" accentColor="border-success" />
    )).innerHTML
    expect(markup).toContain('border-success')
  })

  it('applies the hover-lift class when hoverLift is true', () => {
    const markup = mount(() => <KpiCard title="T" value="V" hoverLift />).innerHTML
    expect(markup).toContain('kpiCardHoverLift')
  })

  it('omits the hover-lift class by default', () => {
    expect(mount(() => <KpiCard title="T" value="V" />).innerHTML).not.toContain('kpiCardHoverLift')
  })

  it('forwards data-mol-id and className onto the Card', () => {
    const markup = mount(() => (
      <KpiCard title="T" value="V" dataMolId="kpi-revenue" className="card-cls" />
    )).innerHTML
    expect(markup).toContain('data-mol-id="kpi-revenue"')
    expect(markup).toContain('card-cls')
  })

  it('emits the uppercase-label styling when upperLabel is true', () => {
    const markup = mount(() => <KpiCard title="T" value="V" upperLabel />).innerHTML
    expect(markup).toContain('kpiCardTitleUppercase')
  })

  it('emits the extrabold weight for the value when emphasizeValue is true', () => {
    const markup = mount(() => <KpiCard title="T" value="V" emphasizeValue />).innerHTML
    expect(markup).toContain('fontWeight:extrabold')
  })
})
