// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { bucketValue, computeQuantileThresholds, Heatmap } from '../Heatmap.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
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
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in I18nProvider so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
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

  it('renders an svg with role=img', () => {
    const { container } = render(
      <Wrap>
        <Heatmap data={[]} range={range} />
      </Wrap>,
    )
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('role')).toBe('img')
    expect(svg?.getAttribute('data-mol-id')).toBe('heatmap')
  })

  it('renders one rect per in-range day', () => {
    const { container } = render(
      <Wrap>
        <Heatmap data={[]} range={range} showMonthLabels={false} />
      </Wrap>,
    )
    const rects = container.querySelectorAll('rect')
    // Jan has 31 days
    expect(rects.length).toBe(31)
  })

  it('attaches aria-label and value to data cells', () => {
    const { container } = render(
      <Wrap>
        <Heatmap data={[{ date: '2025-01-15', value: 7 }]} range={range} />
      </Wrap>,
    )
    const cell = container.querySelector('[data-mol-id="heatmap-cell-2025-01-15"]')
    expect(cell).not.toBeNull()
    expect(cell?.getAttribute('aria-label')).toContain('2025-01-15')
    expect(cell?.getAttribute('data-value')).toBe('7')
  })

  it('fires onCellClick with the cell descriptor', () => {
    const onCellClick = vi.fn()
    const { container } = render(
      <Wrap>
        <Heatmap
          data={[{ date: '2025-01-10', value: 3, payload: { id: 'abc' } }]}
          range={range}
          onCellClick={onCellClick}
        />
      </Wrap>,
    )
    const cell = container.querySelector('[data-mol-id="heatmap-cell-2025-01-10"]')!
    fireEvent.click(cell)
    expect(onCellClick).toHaveBeenCalledTimes(1)
    expect(onCellClick.mock.calls[0][0]).toMatchObject({
      date: '2025-01-10',
      value: 3,
      payload: { id: 'abc' },
    })
  })

  it('fires onCellHover with cell descriptor', () => {
    const onCellHover = vi.fn()
    const { container } = render(
      <Wrap>
        <Heatmap
          data={[{ date: '2025-01-20', value: 4 }]}
          range={range}
          onCellHover={onCellHover}
        />
      </Wrap>,
    )
    const cell = container.querySelector('[data-mol-id="heatmap-cell-2025-01-20"]')!
    fireEvent.mouseEnter(cell)
    expect(onCellHover).toHaveBeenCalledTimes(1)
    expect(onCellHover.mock.calls[0][0]).toMatchObject({ date: '2025-01-20', value: 4 })
  })

  it('uses tooltipFormatter when provided', () => {
    const { container } = render(
      <Wrap>
        <Heatmap
          data={[{ date: '2025-01-05', value: 9 }]}
          range={range}
          tooltipFormatter={(c) => `*${c.date}*`}
        />
      </Wrap>,
    )
    const cell = container.querySelector('[data-mol-id="heatmap-cell-2025-01-05"]')!
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
    const { container } = render(
      <Wrap>
        <Heatmap data={data} range={range} colorScale={palette} />
      </Wrap>,
    )
    const cell = container.querySelector('[data-mol-id="heatmap-cell-2025-01-15"]')!
    expect(cell.getAttribute('fill')).toBe('#444')
    // Lowest non-zero day uses bucket 1.
    const lowCell = container.querySelector('[data-mol-id="heatmap-cell-2025-01-05"]')!
    expect(lowCell.getAttribute('fill')).toBe('#111')
  })

  it('renders month labels by default', () => {
    const { container } = render(
      <Wrap>
        <Heatmap data={[]} range={range} />
      </Wrap>,
    )
    const monthLabel = container.querySelector('[data-mol-id="heatmap-month-0"]')
    expect(monthLabel?.textContent).toBe('Jan')
  })

  it('hides month labels when showMonthLabels=false', () => {
    const { container } = render(
      <Wrap>
        <Heatmap data={[]} range={range} showMonthLabels={false} />
      </Wrap>,
    )
    const monthLabel = container.querySelector('[data-mol-id="heatmap-month-0"]')
    expect(monthLabel).toBeNull()
  })

  it('renders weekday labels when showWeekdayLabels=true', () => {
    const { container } = render(
      <Wrap>
        <Heatmap data={[]} range={range} showWeekdayLabels />
      </Wrap>,
    )
    // Mon/Wed/Fri pattern (every other from index 1)
    const mon = container.querySelector('[data-mol-id="heatmap-weekday-1"]')
    expect(mon?.textContent).toBe('Mon')
  })
})
