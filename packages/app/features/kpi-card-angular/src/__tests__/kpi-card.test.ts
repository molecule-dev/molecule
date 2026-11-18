// @vitest-environment jsdom
/**
 * Unit tests of the Angular KPI card primitives — the port of
 * `@molecule/app-kpi-card-react`'s own suite. The React suite renders the
 * components with a mocked ClassMap and asserts the markup; this port mounts
 * the same tree through Angular's real renderer (the same `createApplication` +
 * JIT host approach the conformance kit's Angular adapter uses) and asserts the
 * same markup.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
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

const { KpiCard } = await import('../kpi-card.component.js')
const { KpiCardGrid } = await import('../kpi-card-grid.component.js')
const { KpiCardTrend } = await import('../kpi-card-trend.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The bound inputs of the KPI card, shared by its cases. */
const CARD_BINDINGS =
  '[accentSide]="p[\'accentSide\']" [accentColor]="p[\'accentColor\']" [upperLabel]="p[\'upperLabel\']" [emphasizeValue]="p[\'emphasizeValue\']" [hoverLift]="p[\'hoverLift\']" [className]="p[\'className\']" [dataMolId]="p[\'dataMolId\']"'

const mounted: Mounted[] = []

/**
 * Renders one KpiCard with the given projected content.
 *
 * @param inner - The projected content (its `[slot=…]` parts included).
 * @param props - The inputs to bind.
 * @returns The mounted host.
 */
const renderCard = async (inner: string, props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<div mol-kpi-card ${CARD_BINDINGS}>${inner}</div>`,
    KpiCard as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

/**
 * Renders one KpiCardGrid with the given projected content.
 *
 * @param inner - The projected cards.
 * @param props - The inputs to bind.
 * @returns The mounted host.
 */
const renderGrid = async (inner: string, props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<div mol-kpi-card-grid [columns]="p['columns']" [gap]="p['gap']" [className]="p['className']">${inner}</div>`,
    KpiCardGrid as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

/**
 * Renders one KpiCardTrend.
 *
 * @param props - The inputs to bind.
 * @returns The mounted host.
 */
const renderTrend = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<span mol-kpi-card-trend [delta]="p['delta']" [direction]="p['direction']" [suffix]="p['suffix']" [className]="p['className']"></span>`,
    KpiCardTrend as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

/**
 * The text content of the first element matching a selector.
 *
 * @param m - The mounted host.
 * @param selector - The selector.
 * @returns The element's text, or null when nothing matches.
 */
const text = (m: Mounted, selector: string): string | null =>
  m.host.querySelector(selector)?.textContent ?? null

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('KpiCardTrend', () => {
  it('derives "up" (▲) from a positive delta', async () => {
    expect((await renderTrend({ delta: 12.3 })).host.innerHTML).toContain('▲')
  })

  it('derives "down" (▼) from a negative delta', async () => {
    expect((await renderTrend({ delta: -4 })).host.innerHTML).toContain('▼')
  })

  it('derives "flat" (–) from a zero delta', async () => {
    expect((await renderTrend({ delta: 0 })).host.innerHTML).toContain('–')
  })

  it('honours an explicit direction over the delta sign', async () => {
    // positive delta but forced down
    expect((await renderTrend({ delta: 9, direction: 'down' })).host.innerHTML).toContain('▼')
  })

  it('renders the absolute value of the delta', async () => {
    const m = await renderTrend({ delta: -7.5 })
    const amount = text(m, 'span[mol-kpi-card-trend] > span:last-child')
    expect(amount).toContain('7.5')
    expect(amount).not.toContain('-7.5')
  })

  it('defaults the suffix to "%"', async () => {
    const m = await renderTrend({ delta: 3 })
    expect(text(m, 'span[mol-kpi-card-trend] > span:last-child')).toContain('3%')
  })

  it('honours a custom suffix', async () => {
    const m = await renderTrend({ delta: 3, suffix: 'pts' })
    expect(text(m, 'span[mol-kpi-card-trend] > span:last-child')).toContain('3pts')
  })

  it('marks the arrow glyph aria-hidden', async () => {
    const markup = (await renderTrend({ delta: 1 })).host.innerHTML
    expect(markup).toMatch(/<span aria-hidden="true">▲<\/span>/)
  })

  it('forwards className onto the wrapper', async () => {
    const m = await renderTrend({ delta: 1, className: 'trend-cls' })
    expect(m.host.querySelector('[mol-kpi-card-trend]')?.getAttribute('class')).toContain(
      'trend-cls',
    )
  })
})

describe('KpiCardGrid', () => {
  it('renders its children', async () => {
    expect((await renderGrid('<span>card-a</span>')).host.innerHTML).toContain('card-a')
  })

  it('renders a single <div> wrapper', async () => {
    const markup = (await renderGrid('x')).host.innerHTML
    expect(markup.startsWith('<div')).toBe(true)
  })

  it('forwards className', async () => {
    const m = await renderGrid('x', { className: 'grid-cls' })
    expect(m.host.querySelector('[mol-kpi-card-grid]')?.getAttribute('class')).toContain('grid-cls')
  })

  it('accepts custom columns + gap without throwing', async () => {
    await expect(renderGrid('x', { columns: 6, gap: 'lg' })).resolves.toBeDefined()
  })
})

describe('KpiCard', () => {
  it('renders title and value', async () => {
    const markup = (
      await renderCard('<span slot="title">Revenue</span><span slot="value">$1,200</span>')
    ).host.innerHTML
    expect(markup).toContain('Revenue')
    expect(markup).toContain('$1,200')
  })

  it('renders subtitle when provided', async () => {
    const markup = (
      await renderCard(
        '<span slot="title">T</span><span slot="value">V</span><span slot="subtitle">vs last week</span>',
      )
    ).host.innerHTML
    expect(markup).toContain('vs last week')
  })

  it('omits the trend/subtitle row entirely when neither is given', async () => {
    // the only spans should be inside the title row + value — no third row
    const m = await renderCard('<span slot="title">T</span><span slot="value">V</span>')
    expect(m.host.innerHTML).not.toContain('vs last week')
    expect(m.host.querySelectorAll('[mol-kpi-card] > div > div')).toHaveLength(2)
  })

  it('renders icon, trend, and action slots', async () => {
    const markup = (
      await renderCard(
        '<span slot="title">T</span><span slot="value">V</span><i slot="icon" data-slot="icon"></i><span slot="trend" data-slot="trend">up</span><button slot="action" data-slot="action">...</button>',
      )
    ).host.innerHTML
    expect(markup).toContain('data-slot="icon"')
    expect(markup).toContain('data-slot="trend"')
    expect(markup).toContain('data-slot="action"')
  })

  it('emits a left-edge accent class when accentSide="left"', async () => {
    const m = await renderCard('<span slot="title">T</span><span slot="value">V</span>', {
      accentSide: 'left',
    })
    const classes = m.host.querySelector('[mol-kpi-card]')?.getAttribute('class') ?? ''
    expect(classes).toContain('kpiCardAccentLeft')
    expect(classes).toContain('kpiCardAccentColor')
  })

  it('emits a top-edge accent class when accentSide="top"', async () => {
    const m = await renderCard('<span slot="title">T</span><span slot="value">V</span>', {
      accentSide: 'top',
    })
    expect(m.host.querySelector('[mol-kpi-card]')?.getAttribute('class')).toContain(
      'kpiCardAccentTop',
    )
  })

  it('emits no accent class by default (accentSide="none")', async () => {
    const m = await renderCard('<span slot="title">T</span><span slot="value">V</span>')
    const classes = m.host.querySelector('[mol-kpi-card]')?.getAttribute('class') ?? ''
    expect(classes).not.toContain('kpiCardAccentLeft')
    expect(classes).not.toContain('kpiCardAccentTop')
  })

  it('honours a custom accentColor', async () => {
    const m = await renderCard('<span slot="title">T</span><span slot="value">V</span>', {
      accentSide: 'left',
      accentColor: 'border-success',
    })
    expect(m.host.querySelector('[mol-kpi-card]')?.getAttribute('class')).toContain(
      'border-success',
    )
  })

  it('applies the hover-lift class when hoverLift is true', async () => {
    const m = await renderCard('<span slot="title">T</span><span slot="value">V</span>', {
      hoverLift: true,
    })
    expect(m.host.querySelector('[mol-kpi-card]')?.getAttribute('class')).toContain(
      'kpiCardHoverLift',
    )
  })

  it('omits the hover-lift class by default', async () => {
    const m = await renderCard('<span slot="title">T</span><span slot="value">V</span>')
    expect(m.host.querySelector('[mol-kpi-card]')?.getAttribute('class')).not.toContain(
      'kpiCardHoverLift',
    )
  })

  it('forwards data-mol-id and className onto the Card', async () => {
    const m = await renderCard('<span slot="title">T</span><span slot="value">V</span>', {
      dataMolId: 'kpi-revenue',
      className: 'card-cls',
    })
    const root = m.host.querySelector('[mol-kpi-card]')
    expect(root?.getAttribute('data-mol-id')).toBe('kpi-revenue')
    expect(root?.getAttribute('class')).toContain('card-cls')
  })

  it('emits the uppercase-label styling when upperLabel is true', async () => {
    const m = await renderCard('<span slot="title">T</span><span slot="value">V</span>', {
      upperLabel: true,
    })
    expect(m.host.innerHTML).toContain('kpiCardTitleUppercase')
  })

  it('emits the extrabold weight for the value when emphasizeValue is true', async () => {
    const m = await renderCard('<span slot="title">T</span><span slot="value">V</span>', {
      emphasizeValue: true,
    })
    expect(m.host.innerHTML).toContain('fontWeight:extrabold')
  })
})
