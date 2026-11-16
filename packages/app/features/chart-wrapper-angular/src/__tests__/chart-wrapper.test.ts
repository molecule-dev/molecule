// @vitest-environment jsdom
/**
 * Unit tests of `ChartCard` / `ChartLegend` — the port of
 * `@molecule/app-chart-wrapper-react`'s own suite: the same test names and the
 * same behavioral assertions, mounted through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular adapter
 * uses) with the mocked ClassMap the React suite uses.
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

const { ChartCard } = await import('../chart-card.component.js')
const { ChartLegend } = await import('../chart-legend.component.js')

/** A mounted spec host: its DOM, a props setter and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
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
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts a component and remembers it for teardown.
 *
 * @param template - The host template.
 * @param component - The component class under test.
 * @param props - The props object the template reads.
 * @returns The mounted host.
 */
const render = async (
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> => {
  const m = await mount(template, component, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/** The card's own host element. */
const cardEl = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector('[mol-chart-card]')
  if (!el) throw new Error('no ChartCard host rendered')
  return el as HTMLElement
}

/** The chart body div (the one carrying the minimum height). */
const bodyEl = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector('[style*="min-height"]')
  if (!el) throw new Error('no chart body rendered')
  return el as HTMLElement
}

describe('ChartCard', () => {
  it('renders the title in an <h3> and its children', async () => {
    const m = await render(
      `<div mol-chart-card [title]="p['title']"><div data-chart></div></div>`,
      ChartCard as Type<unknown>,
      { title: 'Revenue' },
    )
    expect(m.host.innerHTML).toContain('<h3')
    expect(m.host.innerHTML).toContain('Revenue')
    expect(m.host.innerHTML).toContain('data-chart')
  })

  it('renders description / actions / summary / footer slots when present and omits them otherwise', async () => {
    const full = await render(
      `<div mol-chart-card [title]="p['title']"><p slot="description">desc-x</p><span slot="actions" data-actions></span><span slot="summary" data-summary></span><span slot="footer" data-footer></span>x</div>`,
      ChartCard as Type<unknown>,
      { title: 'T' },
    )
    expect(full.host.innerHTML).toContain('desc-x')
    expect(full.host.innerHTML).toContain('data-actions')
    expect(full.host.innerHTML).toContain('data-summary')
    expect(full.host.innerHTML).toContain('data-footer')
    const bare = await render(
      `<div mol-chart-card [title]="p['title']">x</div>`,
      ChartCard as Type<unknown>,
      { title: 'T' },
    )
    expect(bare.host.innerHTML).not.toContain('data-actions')
    expect(bare.host.innerHTML).not.toContain('data-summary')
    expect(bare.host.innerHTML).not.toContain('data-footer')
    expect(bare.host.querySelector('p')).toBeNull()
  })

  it('applies the default 240px minimum chart height', async () => {
    const m = await render(
      `<div mol-chart-card [title]="p['title']">x</div>`,
      ChartCard as Type<unknown>,
      { title: 'T' },
    )
    expect(bodyEl(m.host).getAttribute('style')).toContain('min-height: 240px')
  })

  it('honours a custom minChartHeight', async () => {
    const m = await render(
      `<div mol-chart-card [title]="p['title']" [minChartHeight]="p['minChartHeight']">x</div>`,
      ChartCard as Type<unknown>,
      { title: 'T', minChartHeight: 400 },
    )
    expect(bodyEl(m.host).getAttribute('style')).toContain('min-height: 400px')
  })

  it('sets data-mol-id and forwards className onto the Card', async () => {
    const m = await render(
      `<div mol-chart-card [title]="p['title']" [className]="p['className']" [dataMolId]="p['dataMolId']">x</div>`,
      ChartCard as Type<unknown>,
      { title: 'T', dataMolId: 'chart-x', className: 'cc-cls' },
    )
    const card = cardEl(m.host)
    expect(card.getAttribute('data-mol-id')).toBe('chart-x')
    expect(card.getAttribute('class')).toContain('cc-cls')
  })
})

describe('ChartLegend', () => {
  const items = [
    { id: 's1', label: 'Series 1', color: '#f00' },
    { id: 's2', label: 'Series 2', color: '#0f0', value: '42' },
  ]

  const template = `<div mol-chart-legend [items]="p['items']" [onToggle]="p['onToggle']" [className]="p['className']"></div>`

  it('renders every series label', async () => {
    const m = await render(template, ChartLegend as Type<unknown>, { items })
    expect(m.host.innerHTML).toContain('Series 1')
    expect(m.host.innerHTML).toContain('Series 2')
  })

  it('renders the swatch color via inline style', async () => {
    const m = await render(template, ChartLegend as Type<unknown>, { items })
    // The DOM serializes `#f00` through the CSSOM, exactly as React's does.
    expect(m.host.innerHTML).toContain('background: rgb(255, 0, 0)')
    expect(m.host.innerHTML).toContain('background: rgb(0, 255, 0)')
  })

  it('renders the optional value when present', async () => {
    const m = await render(template, ChartLegend as Type<unknown>, { items })
    expect(m.host.innerHTML).toContain('42')
  })

  it('renders plain spans (no buttons) when onToggle is absent', async () => {
    const m = await render(template, ChartLegend as Type<unknown>, { items })
    expect(m.host.querySelector('button')).toBeNull()
  })

  it('renders toggle buttons with aria-pressed reflecting visibility when onToggle is given', async () => {
    const m = await render(template, ChartLegend as Type<unknown>, {
      items: [
        { id: 's1', label: 'A', color: '#f00' },
        { id: 's2', label: 'B', color: '#0f0', hidden: true },
      ],
      onToggle: () => {},
    })
    const buttons = Array.from(m.host.querySelectorAll('button'))
    expect(buttons.length).toBe(2)
    expect(buttons[0]?.getAttribute('aria-pressed')).toBe('true')
    expect(buttons[1]?.getAttribute('aria-pressed')).toBe('false')
  })

  it('forwards className', async () => {
    const m = await render(template, ChartLegend as Type<unknown>, { items, className: 'leg-cls' })
    const el = m.host.querySelector('[mol-chart-legend]')
    expect(el?.getAttribute('class')).toContain('leg-cls')
  })
})
