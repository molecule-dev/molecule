// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `Heatmap` — a port of
 * `@molecule/app-heatmap-react/src/__tests__/Heatmap.test.tsx`: the same test
 * names and the same assertions, mounted with Svelte in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import Heatmap from '../Heatmap.svelte'
import type { HeatmapProps } from '../types.js'
import { bucketValue, computeQuantileThresholds } from '../utilities.js'

// A ClassMap proxy echoing each accessed member back as its token, so the
// component renders without a real bond — the same stub the React suite uses.
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
        return (..._args: unknown[]): string => token
      },
    }
    return new Proxy({}, handler)
  },
}))

/** A mounted heatmap: the component instance and its target element. */
interface Mounted {
  /**
   * The handle `unmount` takes back. Svelte's wildcard `*.svelte` module
   * declaration types a component as `LegacyComponentType`, so `mount()`
   * resolves its export object to the legacy instance shape
   * (`{ $on?, $set? } & Record<string, any>`), not `Record<string, never>`.
   */
  readonly component: ReturnType<typeof mount<HeatmapProps, Record<string, unknown>>>
  /** The element the component renders into. */
  readonly target: HTMLElement
}

const mounted: Mounted[] = []

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const { component, target } of mounted.splice(0)) {
    void unmount(component)
    target.remove()
  }
  document.body.innerHTML = ''
})

/**
 * Mounts a `Heatmap` with the given props and remembers it for teardown.
 *
 * @param props - The component's props.
 * @returns The mounted component and its target.
 */
const mountHeatmap = (props: HeatmapProps): Mounted => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(Heatmap, { target, props })
  flushSync()
  const entry: Mounted = { component, target }
  mounted.push(entry)
  return entry
}

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

  it('renders the svg as a labelled group', () => {
    const { target } = mountHeatmap({ data: [], range })
    const svg = target.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('role')).toBe('group')
    expect(svg?.getAttribute('aria-label')).toBe('Activity heatmap')
    expect(svg?.getAttribute('data-mol-id')).toBe('heatmap')
  })

  it('renders one rect per in-range day', () => {
    const { target } = mountHeatmap({ data: [], range, showMonthLabels: false })
    const rects = target.querySelectorAll('rect')
    // Jan has 31 days
    expect(rects.length).toBe(31)
  })

  it('attaches aria-label and value to data cells', () => {
    const { target } = mountHeatmap({ data: [{ date: '2025-01-15', value: 7 }], range })
    const cell = target.querySelector('[data-mol-id="heatmap-cell-2025-01-15"]')
    expect(cell).not.toBeNull()
    expect(cell?.getAttribute('aria-label')).toContain('2025-01-15')
    expect(cell?.getAttribute('data-value')).toBe('7')
  })

  it('renders a non-clickable cell as an image without a tabindex', () => {
    const { target } = mountHeatmap({ data: [{ date: '2025-01-15', value: 7 }], range })
    const cell = target.querySelector('[data-mol-id="heatmap-cell-2025-01-15"]')!
    expect(cell.getAttribute('role')).toBe('img')
    expect(cell.hasAttribute('tabindex')).toBe(false)
    expect(cell.getAttribute('aria-label')).toContain('2025-01-15')
  })

  it('renders a clickable cell as a button with a tabindex', () => {
    const { target } = mountHeatmap({
      data: [{ date: '2025-01-15', value: 7 }],
      range,
      onCellClick: () => undefined,
    })
    const cell = target.querySelector('[data-mol-id="heatmap-cell-2025-01-15"]')!
    expect(cell.getAttribute('role')).toBe('button')
    expect(cell.getAttribute('tabindex')).toBe('0')
    expect(cell.getAttribute('aria-label')).toContain('2025-01-15')
  })

  it('activates a clickable cell on Enter', () => {
    const onCellClick = vi.fn()
    const { target } = mountHeatmap({
      data: [{ date: '2025-01-10', value: 3 }],
      range,
      onCellClick,
    })
    const cell = target.querySelector('[data-mol-id="heatmap-cell-2025-01-10"]')!
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onCellClick).toHaveBeenCalledTimes(1)
    expect(onCellClick.mock.calls[0][0]).toMatchObject({ date: '2025-01-10', value: 3 })
  })

  it('activates a clickable cell on Space', () => {
    const onCellClick = vi.fn()
    const { target } = mountHeatmap({
      data: [{ date: '2025-01-10', value: 3 }],
      range,
      onCellClick,
    })
    const cell = target.querySelector('[data-mol-id="heatmap-cell-2025-01-10"]')!
    cell.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(onCellClick).toHaveBeenCalledTimes(1)
    expect(onCellClick.mock.calls[0][0]).toMatchObject({ date: '2025-01-10', value: 3 })
  })

  it('hides the axis labels from assistive technology', () => {
    const { target } = mountHeatmap({ data: [], range, showWeekdayLabels: true })
    const month = target.querySelector('[data-mol-id="heatmap-month-0"]')
    const weekday = target.querySelector('[data-mol-id="heatmap-weekday-1"]')
    expect(month?.getAttribute('aria-hidden')).toBe('true')
    expect(weekday?.getAttribute('aria-hidden')).toBe('true')
  })

  it('fires onCellClick with the cell descriptor', () => {
    const onCellClick = vi.fn()
    const { target } = mountHeatmap({
      data: [{ date: '2025-01-10', value: 3, payload: { id: 'abc' } }],
      range,
      onCellClick,
    })
    const cell = target.querySelector('[data-mol-id="heatmap-cell-2025-01-10"]')!
    cell.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onCellClick).toHaveBeenCalledTimes(1)
    expect(onCellClick.mock.calls[0][0]).toMatchObject({
      date: '2025-01-10',
      value: 3,
      payload: { id: 'abc' },
    })
  })

  it('fires onCellHover with cell descriptor', () => {
    const onCellHover = vi.fn()
    const { target } = mountHeatmap({
      data: [{ date: '2025-01-20', value: 4 }],
      range,
      onCellHover,
    })
    const cell = target.querySelector('[data-mol-id="heatmap-cell-2025-01-20"]')!
    cell.dispatchEvent(new MouseEvent('mouseenter'))
    expect(onCellHover).toHaveBeenCalledTimes(1)
    expect(onCellHover.mock.calls[0][0]).toMatchObject({ date: '2025-01-20', value: 4 })
  })

  it('uses tooltipFormatter when provided', () => {
    const { target } = mountHeatmap({
      data: [{ date: '2025-01-05', value: 9 }],
      range,
      tooltipFormatter: (cell) => `*${cell.date}*`,
    })
    const cell = target.querySelector('[data-mol-id="heatmap-cell-2025-01-05"]')!
    expect(cell.getAttribute('aria-label')).toBe('*2025-01-05*')
  })

  it('respects custom palette', () => {
    const palette = ['#000', '#111', '#222', '#333', '#444'] as const
    // Distribution: 1, 2, 3, 4, 100 → 100 lands in top bucket (4).
    const data = [
      { date: '2025-01-05', value: 1 },
      { date: '2025-01-06', value: 2 },
      { date: '2025-01-07', value: 3 },
      { date: '2025-01-08', value: 4 },
      { date: '2025-01-15', value: 100 },
    ]
    const { target } = mountHeatmap({ data, range, colorScale: palette })
    const cell = target.querySelector('[data-mol-id="heatmap-cell-2025-01-15"]')!
    expect(cell.getAttribute('fill')).toBe('#444')
    // Lowest non-zero day uses bucket 1.
    const lowCell = target.querySelector('[data-mol-id="heatmap-cell-2025-01-05"]')!
    expect(lowCell.getAttribute('fill')).toBe('#111')
  })

  it('renders month labels by default', () => {
    const { target } = mountHeatmap({ data: [], range })
    const monthLabel = target.querySelector('[data-mol-id="heatmap-month-0"]')
    expect(monthLabel?.textContent).toBe('Jan')
  })

  it('hides month labels when showMonthLabels=false', () => {
    const { target } = mountHeatmap({ data: [], range, showMonthLabels: false })
    const monthLabel = target.querySelector('[data-mol-id="heatmap-month-0"]')
    expect(monthLabel).toBeNull()
  })

  it('renders weekday labels when showWeekdayLabels=true', () => {
    const { target } = mountHeatmap({ data: [], range, showWeekdayLabels: true })
    // Mon/Wed/Fri pattern (every other from index 1)
    const mon = target.querySelector('[data-mol-id="heatmap-weekday-1"]')
    expect(mon?.textContent).toBe('Mon')
  })
})
