// @vitest-environment jsdom
/**
 * Unit tests of `GpaCard` / `Gradebook` — the port of
 * `@molecule/app-gradebook-react/src/__tests__/Gradebook.test.tsx`: the same
 * test names and the same behavioral assertions, mounted through Angular's
 * real renderer (the same `createApplication` + JIT host approach the
 * conformance kit's Angular adapter uses).
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { GpaCard } from '../gpa-card.component.js'
import { Gradebook } from '../gradebook.component.js'
import type { Grade } from '../types.js'
import { computePercentage, defaultGpaMax, formatGpa } from '../utilities.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings, every
 * other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<UIClassMap> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  // The proxy target is empty on purpose: every property is supplied by the
  // get trap above, so the stub carries no state of its own.
  return new Proxy({} as UIClassMap, handler)
}

/** The host template for a GPA card rendering: every prop bound. */
const GPA_TEMPLATE = `<div mol-gpa-card [gpa]="p['gpa']" [scale]="p['scale']" [max]="p['max']" [trend]="p['trend']" [trendLabel]="p['trendLabel']" [className]="p['className']"></div>`

/** The host template for a gradebook rendering: every prop bound. */
const GRADEBOOK_TEMPLATE = `<div mol-gradebook [grades]="p['grades']" [gpaScale]="p['gpaScale']" [onCellClick]="p['onCellClick']" [className]="p['className']"></div>`

/** A mounted spec host: its DOM, a props setter and a teardown. */
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
 * @param component - The component class under test.
 * @param hostTemplate - The host template.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  component: Type<unknown>,
  hostTemplate: string,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: hostTemplate,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  // Two passes: the first mounts, the second reflects the optional-region
  // signals the view checks settle.
  appRef.tick()
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

const mounted: Mounted[] = []

beforeEach(() => {
  setClassMap(buildStubClassMap())
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('utilities', () => {
  it('computePercentage normalizes score against maxPoints', () => {
    expect(computePercentage({ id: '1', title: 't', score: 80, maxPoints: 100 })).toBe(80)
    expect(computePercentage({ id: '1', title: 't', score: 45, maxPoints: 50 })).toBe(90)
  })

  it('computePercentage treats missing maxPoints as 100', () => {
    expect(computePercentage({ id: '1', title: 't', score: 73 })).toBe(73)
  })

  it('computePercentage clamps to [0, 100] and handles non-finite input', () => {
    expect(computePercentage({ id: '1', title: 't', score: 9999, maxPoints: 100 })).toBe(100)
    expect(computePercentage({ id: '1', title: 't', score: -5, maxPoints: 100 })).toBe(0)
    expect(computePercentage({ id: '1', title: 't', score: NaN, maxPoints: 100 })).toBe(0)
  })

  it('formatGpa renders 4.0 / 5.0 with two decimals and percentage with %', () => {
    expect(formatGpa(3.72, '4.0')).toBe('3.72')
    expect(formatGpa(4.5, '5.0')).toBe('4.50')
    expect(formatGpa(87, 'percentage')).toBe('87%')
    expect(formatGpa(NaN, '4.0')).toBe('0.00')
    expect(formatGpa(NaN, 'percentage')).toBe('0%')
  })

  it('defaultGpaMax returns the right ceiling per scale', () => {
    expect(defaultGpaMax('4.0')).toBe(4)
    expect(defaultGpaMax('5.0')).toBe(5)
    expect(defaultGpaMax('percentage')).toBe(100)
  })
})

const baseGrades: Grade[] = [
  {
    id: 'g1',
    title: 'Calculus I',
    letter: 'A-',
    score: 92,
    maxPoints: 100,
    weight: 0.25,
    contribution: 0.93,
    postedAt: '2026-04-01',
  },
  {
    id: 'g2',
    title: 'Physics II',
    letter: 'B+',
    score: 41,
    maxPoints: 50,
    weight: 0.25,
    contribution: 0.83,
  },
]

/**
 * Mounts a {@link Gradebook} and remembers it for teardown.
 *
 * @param props - The gradebook props.
 * @returns The mounted host.
 */
const renderGradebook = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(Gradebook as Type<unknown>, GRADEBOOK_TEMPLATE, props)
  mounted.push(m)
  return m
}

/**
 * Mounts a {@link GpaCard} and remembers it for teardown.
 *
 * @param props - The card props.
 * @returns The mounted host.
 */
const renderGpaCard = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(GpaCard as Type<unknown>, GPA_TEMPLATE, props)
  mounted.push(m)
  return m
}

describe('<Gradebook>', () => {
  it('renders a region with the gradebook aria-label', async () => {
    const m = await renderGradebook({ grades: baseGrades, gpaScale: '4.0' })
    const region = m.host.querySelector('[role="region"]')
    expect(region?.getAttribute('aria-label')).toBe('Gradebook')
    expect(region?.getAttribute('data-mol-id')).toBe('gradebook')
  })

  it('renders one row per grade with title, letter, and weight', async () => {
    const m = await renderGradebook({ grades: baseGrades, gpaScale: '4.0' })
    const rows = m.host.querySelectorAll('[data-mol-id="gradebook-row"]')
    expect(rows.length).toBe(2)
    expect(rows[0].getAttribute('data-row-id')).toBe('g1')
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-title"]')?.textContent).toBe(
      'Calculus I',
    )
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-letter"]')?.textContent).toBe('A-')
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-weight"]')?.textContent).toBe('25%')
  })

  it('renders score / maxPoints in the numeric column for non-percentage scales', async () => {
    const m = await renderGradebook({ grades: baseGrades, gpaScale: '4.0' })
    const rows = m.host.querySelectorAll('[data-mol-id="gradebook-row"]')
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-numeric"]')?.textContent).toBe(
      '92 / 100',
    )
    expect(rows[1].querySelector('[data-mol-id="gradebook-cell-numeric"]')?.textContent).toBe(
      '41 / 50',
    )
  })

  it('renders rounded percentages when gpaScale is percentage', async () => {
    const m = await renderGradebook({ grades: baseGrades, gpaScale: 'percentage' })
    const rows = m.host.querySelectorAll('[data-mol-id="gradebook-row"]')
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-numeric"]')?.textContent).toBe('92%')
    expect(rows[1].querySelector('[data-mol-id="gradebook-cell-numeric"]')?.textContent).toBe('82%')
  })

  it('renders contribution column using formatGpa for the active scale', async () => {
    const m = await renderGradebook({ grades: baseGrades, gpaScale: '4.0' })
    const rows = m.host.querySelectorAll('[data-mol-id="gradebook-row"]')
    expect(rows[0].querySelector('[data-mol-id="gradebook-cell-contribution"]')?.textContent).toBe(
      '0.93',
    )
  })

  it('renders em-dash placeholders for missing optional fields', async () => {
    const m = await renderGradebook({
      grades: [{ id: 'g3', title: 'Quiz', score: 50, maxPoints: 60 }],
      gpaScale: '4.0',
    })
    expect(m.host.querySelector('[data-mol-id="gradebook-cell-letter"]')?.textContent).toBe('—')
    expect(m.host.querySelector('[data-mol-id="gradebook-cell-weight"]')?.textContent).toBe('—')
    expect(m.host.querySelector('[data-mol-id="gradebook-cell-contribution"]')?.textContent).toBe(
      '—',
    )
  })

  it('renders an empty state when grades is empty', async () => {
    const m = await renderGradebook({ grades: [], gpaScale: '4.0' })
    expect(m.host.querySelector('[data-mol-id="gradebook-empty"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="gradebook-table"]')).toBeNull()
  })

  it('fires onCellClick with the grade and column id when a cell is clicked', async () => {
    const onCellClick = vi.fn()
    const m = await renderGradebook({ grades: baseGrades, gpaScale: '4.0', onCellClick })
    m.host
      .querySelector('[data-mol-id="gradebook-cell-title"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onCellClick).toHaveBeenCalledTimes(1)
    expect(onCellClick.mock.calls[0][0].id).toBe('g1')
    expect(onCellClick.mock.calls[0][1]).toBe('title')

    m.host
      .querySelectorAll('[data-mol-id="gradebook-cell-numeric"]')[1]
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onCellClick).toHaveBeenCalledTimes(2)
    expect(onCellClick.mock.calls[1][0].id).toBe('g2')
    expect(onCellClick.mock.calls[1][1]).toBe('numeric')
  })
})

describe('<GpaCard>', () => {
  it('renders the formatted GPA value and the default ceiling for the scale', async () => {
    const m = await renderGpaCard({ gpa: 3.72, scale: '4.0' })
    expect(m.host.querySelector('[data-mol-id="gpa-card-value"]')?.textContent).toBe('3.72')
    expect(m.host.querySelector('[data-mol-id="gpa-card-out-of"]')?.textContent).toBe('out of 4.00')
  })

  it('honours an explicit max prop', async () => {
    const m = await renderGpaCard({ gpa: 4.5, scale: '5.0', max: 5 })
    expect(m.host.querySelector('[data-mol-id="gpa-card-out-of"]')?.textContent).toBe('out of 5.00')
  })

  it('renders percentages without decimals', async () => {
    const m = await renderGpaCard({ gpa: 87, scale: 'percentage' })
    expect(m.host.querySelector('[data-mol-id="gpa-card-value"]')?.textContent).toBe('87%')
    expect(m.host.querySelector('[data-mol-id="gpa-card-out-of"]')?.textContent).toBe('out of 100%')
  })

  it('renders trend chip when trend is set', async () => {
    const m = await renderGpaCard({ gpa: 3.5, scale: '4.0', trend: 'up' })
    let chip = m.host.querySelector('[data-mol-id="gpa-card-trend"]')
    expect(chip).not.toBeNull()
    expect(chip?.getAttribute('data-trend')).toBe('up')
    expect(m.host.querySelector('[data-mol-id="gpa-card-trend-text"]')?.textContent).toBe(
      'Trending up',
    )

    await m.setProps({ trend: 'down' })
    chip = m.host.querySelector('[data-mol-id="gpa-card-trend"]')
    expect(chip?.getAttribute('data-trend')).toBe('down')
    expect(m.host.querySelector('[data-mol-id="gpa-card-trend-text"]')?.textContent).toBe(
      'Trending down',
    )
  })

  it('omits trend chip when trend is not set', async () => {
    const m = await renderGpaCard({ gpa: 3.5, scale: '4.0' })
    expect(m.host.querySelector('[data-mol-id="gpa-card-trend"]')).toBeNull()
  })

  it('renders trendLabel beside the trend chip when provided', async () => {
    const m = await renderGpaCard({
      gpa: 3.5,
      scale: '4.0',
      trend: 'flat',
      trendLabel: 'vs last semester',
    })
    expect(m.host.querySelector('[data-mol-id="gpa-card-trend-label"]')?.textContent).toBe(
      'vs last semester',
    )
  })

  it('shows a projected trendLabel again after the consumer stops and starts passing it', async () => {
    const m = await mount(
      GpaCard,
      `<div mol-gpa-card [gpa]="3.5" trend="up">@if (p['show']) {<span slot="trendLabel">vs last semester</span>}</div>`,
      { show: true },
    )
    mounted.push(m)
    const label = (): Element | null => m.host.querySelector('[data-mol-id="gpa-card-trend-label"]')
    expect(label()).not.toBeNull()
    expect(label()!.textContent).toBe('vs last semester')
    await m.setProps({ show: false })
    expect(label()).toBeNull()
    await m.setProps({ show: true })
    expect(label()).not.toBeNull()
    expect(label()!.textContent).toBe('vs last semester')
  })
})
