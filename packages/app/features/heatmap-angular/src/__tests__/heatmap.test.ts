// @vitest-environment jsdom
/**
 * Unit tests of `Heatmap` — the port of
 * `@molecule/app-heatmap-react`'s own suite: the same test names and the same
 * behavioral assertions, mounted through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) with the mocked ClassMap the React suite uses.
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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

const { bucketValue, computeQuantileThresholds, Heatmap } = await import('../heatmap.component.js')

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
        get(_t, key): (() => string) | undefined {
          if (key === Symbol.toPrimitive || key === 'toString') return (): string => token
          return undefined
        },
      })
    },
  }
  return new Proxy({} as UIClassMap, handler)
}

/** The host template, written the way an Angular app writes the component. */
const TEMPLATE = `<svg mol-heatmap [data]="p['data']" [range]="p['range']" [cellSize]="p['cellSize']" [gap]="p['gap']" [colorScale]="p['colorScale']" [weekStartsOn]="p['weekStartsOn']" [showWeekdayLabels]="p['showWeekdayLabels']" [showMonthLabels]="p['showMonthLabels']" [onCellClick]="p['onCellClick']" [onCellHover]="p['onCellHover']" [tooltipFormatter]="p['tooltipFormatter']" [ariaLabel]="p['ariaLabel']" [className]="p['className']"></svg>`

/** A mounted spec host: its DOM, a flush and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Flushes change detection. */
  flush(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the heatmap through a JIT host template.
 *
 * @param props - The props object the template reads as `p['key']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [Heatmap as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: TEMPLATE,
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
    flush: (): void => appRef.tick(),
    destroy: async (): Promise<void> => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** Mounted hosts, torn down after each test. */
const mounted: Mounted[] = []

/**
 * Mounts a {@link Heatmap} and remembers it for teardown.
 *
 * @param props - The heatmap props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(props)
  mounted.push(m)
  return m
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('computeQuantileThresholds', () => {
  it('returns ascending thresholds', () => {
    const thresholds = computeQuantileThresholds([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(thresholds[0]).toBeLessThanOrEqual(thresholds[1])
    expect(thresholds[1]).toBeLessThanOrEqual(thresholds[2])
    expect(thresholds[2]).toBeLessThanOrEqual(thresholds[3])
  })

  it('handles empty values', () => {
    expect(computeQuantileThresholds([])).toEqual([1, 1, 1, 1])
  })

  it('handles single value', () => {
    const thresholds = computeQuantileThresholds([5])
    expect(thresholds).toEqual([5, 5, 5, 5])
  })
})

describe('bucketValue', () => {
  const thresholds = [1, 3, 5, 8] as const

  it('maps zero to bucket 0', () => {
    expect(bucketValue(0, thresholds)).toBe(0)
    expect(bucketValue(-1, thresholds)).toBe(0)
  })

  it('maps low values to bucket 1', () => {
    expect(bucketValue(1, thresholds)).toBe(1)
  })

  it('maps mid values to bucket 2-3', () => {
    expect(bucketValue(3, thresholds)).toBe(2)
    expect(bucketValue(5, thresholds)).toBe(3)
  })

  it('maps high values to bucket 4', () => {
    expect(bucketValue(10, thresholds)).toBe(4)
    expect(bucketValue(100, thresholds)).toBe(4)
  })
})

describe('<Heatmap>', () => {
  const range = {
    start: new Date(2025, 0, 1),
    end: new Date(2025, 0, 31),
  }

  it('renders the svg as a labelled group', async () => {
    const { host } = await render({ data: [], range })
    const svg = host.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('role')).toBe('group')
    expect(svg?.getAttribute('aria-label')).toBe('Activity heatmap')
    expect(svg?.getAttribute('data-mol-id')).toBe('heatmap')
  })

  it('renders one rect per in-range day', async () => {
    const { host } = await render({ data: [], range, showMonthLabels: false })
    const rects = host.querySelectorAll('rect')
    // Jan has 31 days
    expect(rects.length).toBe(31)
  })

  it('attaches aria-label and value to data cells', async () => {
    const { host } = await render({ data: [{ date: '2025-01-15', value: 7 }], range })
    const cell = host.querySelector('[data-mol-id="heatmap-cell-2025-01-15"]')
    expect(cell).not.toBeNull()
    expect(cell?.getAttribute('aria-label')).toContain('2025-01-15')
    expect(cell?.getAttribute('data-value')).toBe('7')
  })

  it('renders a non-clickable cell as an image without a tabindex', async () => {
    const { host } = await render({ data: [{ date: '2025-01-15', value: 7 }], range })
    const cell = host.querySelector('[data-mol-id="heatmap-cell-2025-01-15"]')!
    expect(cell.getAttribute('role')).toBe('img')
    expect(cell.hasAttribute('tabindex')).toBe(false)
    expect(cell.getAttribute('aria-label')).toContain('2025-01-15')
  })

  it('renders a clickable cell as a button with a tabindex', async () => {
    const { host } = await render({
      data: [{ date: '2025-01-15', value: 7 }],
      range,
      onCellClick: () => undefined,
    })
    const cell = host.querySelector('[data-mol-id="heatmap-cell-2025-01-15"]')!
    expect(cell.getAttribute('role')).toBe('button')
    expect(cell.getAttribute('tabindex')).toBe('0')
    expect(cell.getAttribute('aria-label')).toContain('2025-01-15')
  })

  it('activates a clickable cell on Enter', async () => {
    const calls: Array<Record<string, unknown>> = []
    const { host } = await render({
      data: [{ date: '2025-01-10', value: 3 }],
      range,
      onCellClick: (cell: Record<string, unknown>) => calls.push(cell),
    })
    const cell = host.querySelector('[data-mol-id="heatmap-cell-2025-01-10"]')!
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(calls.length).toBe(1)
    expect(calls[0]).toMatchObject({ date: '2025-01-10', value: 3 })
  })

  it('activates a clickable cell on Space', async () => {
    const calls: Array<Record<string, unknown>> = []
    const { host } = await render({
      data: [{ date: '2025-01-10', value: 3 }],
      range,
      onCellClick: (cell: Record<string, unknown>) => calls.push(cell),
    })
    const cell = host.querySelector('[data-mol-id="heatmap-cell-2025-01-10"]')!
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(calls.length).toBe(1)
    expect(calls[0]).toMatchObject({ date: '2025-01-10', value: 3 })
  })

  it('hides the axis labels from assistive technology', async () => {
    const { host } = await render({ data: [], range, showWeekdayLabels: true })
    const month = host.querySelector('[data-mol-id="heatmap-month-0"]')
    const weekday = host.querySelector('[data-mol-id="heatmap-weekday-1"]')
    expect(month?.getAttribute('aria-hidden')).toBe('true')
    expect(weekday?.getAttribute('aria-hidden')).toBe('true')
  })

  it('fires onCellClick with the cell descriptor', async () => {
    const calls: Array<Record<string, unknown>> = []
    const { host } = await render({
      data: [{ date: '2025-01-10', value: 3, payload: { id: 'abc' } }],
      range,
      onCellClick: (cell: Record<string, unknown>) => calls.push(cell),
    })
    const cell = host.querySelector('[data-mol-id="heatmap-cell-2025-01-10"]')!
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(calls.length).toBe(1)
    expect(calls[0]).toMatchObject({
      date: '2025-01-10',
      value: 3,
      payload: { id: 'abc' },
    })
  })

  it('fires onCellHover with cell descriptor', async () => {
    const calls: Array<Record<string, unknown>> = []
    const { host } = await render({
      data: [{ date: '2025-01-20', value: 4 }],
      range,
      onCellHover: (cell: Record<string, unknown>) => calls.push(cell),
    })
    const cell = host.querySelector('[data-mol-id="heatmap-cell-2025-01-20"]')!
    cell.dispatchEvent(new MouseEvent('mouseenter'))
    expect(calls.length).toBe(1)
    expect(calls[0]).toMatchObject({ date: '2025-01-20', value: 4 })
  })

  it('uses tooltipFormatter when provided', async () => {
    const { host } = await render({
      data: [{ date: '2025-01-05', value: 9 }],
      range,
      tooltipFormatter: (cell: { date: string }) => `*${cell.date}*`,
    })
    const cell = host.querySelector('[data-mol-id="heatmap-cell-2025-01-05"]')!
    expect(cell.getAttribute('aria-label')).toBe('*2025-01-05*')
  })

  it('respects custom palette', async () => {
    const palette = ['#000', '#111', '#222', '#333', '#444'] as const
    // Distribution: 1, 2, 3, 4, 100 → 100 lands in top bucket (4).
    const data = [
      { date: '2025-01-05', value: 1 },
      { date: '2025-01-06', value: 2 },
      { date: '2025-01-07', value: 3 },
      { date: '2025-01-08', value: 4 },
      { date: '2025-01-15', value: 100 },
    ]
    const { host } = await render({ data, range, colorScale: palette })
    const cell = host.querySelector('[data-mol-id="heatmap-cell-2025-01-15"]')!
    expect(cell.getAttribute('fill')).toBe('#444')
    // Lowest non-zero day uses bucket 1.
    const lowCell = host.querySelector('[data-mol-id="heatmap-cell-2025-01-05"]')!
    expect(lowCell.getAttribute('fill')).toBe('#111')
  })

  it('renders month labels by default', async () => {
    const { host } = await render({ data: [], range })
    const monthLabel = host.querySelector('[data-mol-id="heatmap-month-0"]')
    expect(monthLabel?.textContent).toBe('Jan')
  })

  it('hides month labels when showMonthLabels=false', async () => {
    const { host } = await render({ data: [], range, showMonthLabels: false })
    const monthLabel = host.querySelector('[data-mol-id="heatmap-month-0"]')
    expect(monthLabel).toBeNull()
  })

  it('renders weekday labels when showWeekdayLabels=true', async () => {
    const { host } = await render({ data: [], range, showWeekdayLabels: true })
    // Mon/Wed/Fri pattern (every other from index 1)
    const mon = host.querySelector('[data-mol-id="heatmap-weekday-1"]')
    expect(mon?.textContent).toBe('Mon')
  })
})
