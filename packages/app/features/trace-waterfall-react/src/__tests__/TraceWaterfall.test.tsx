// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { layoutSpans, serviceColor } from '../layout.js'
import { formatDurationLabel, TraceWaterfall } from '../TraceWaterfall.js'
import type { Span } from '../types.js'

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

const sampleSpans: Span[] = [
  { id: 'a', name: 'GET /api', service: 'edge', startTime: 0, duration: 100, status: 'ok' },
  { id: 'b', parentId: 'a', name: 'auth.verify', service: 'auth', startTime: 5, duration: 20 },
  { id: 'c', parentId: 'a', name: 'db.query', service: 'db', startTime: 30, duration: 60 },
  { id: 'd', parentId: 'c', name: 'pg.exec', service: 'db', startTime: 32, duration: 50 },
]

describe('formatDurationLabel', () => {
  it('renders sub-millisecond durations as microseconds', () => {
    expect(formatDurationLabel(0.25)).toBe('250µs')
  })
  it('renders sub-second durations as milliseconds', () => {
    expect(formatDurationLabel(125)).toBe('125ms')
  })
  it('renders durations >= 1000 as seconds with one decimal', () => {
    expect(formatDurationLabel(2500)).toBe('2.5s')
  })
  it('clamps invalid values to 0ms', () => {
    expect(formatDurationLabel(-1)).toBe('0ms')
    expect(formatDurationLabel(Number.NaN)).toBe('0ms')
  })
})

describe('serviceColor', () => {
  it('is deterministic per service name', () => {
    expect(serviceColor('auth')).toBe(serviceColor('auth'))
  })
  it('produces different colors for different services in most cases', () => {
    // Across a handful of names we should see at least 2 distinct colors.
    const colors = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(serviceColor))
    expect(colors.size).toBeGreaterThan(1)
  })
})

describe('layoutSpans', () => {
  it('returns rows in depth-first order with correct depths', () => {
    const layout = layoutSpans(sampleSpans)
    expect(layout.rows.map((r) => r.span.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(layout.rows.map((r) => r.depth)).toEqual([0, 1, 1, 2])
  })
  it('sorts siblings by start time', () => {
    const out = layoutSpans([
      { id: 'a', name: 'a', startTime: 0, duration: 100 },
      { id: 'c', parentId: 'a', name: 'c', startTime: 50, duration: 10 },
      { id: 'b', parentId: 'a', name: 'b', startTime: 10, duration: 10 },
    ])
    expect(out.rows.map((r) => r.span.id)).toEqual(['a', 'b', 'c'])
  })
  it('treats orphan parentId as root', () => {
    const out = layoutSpans([
      { id: 'x', parentId: 'missing', name: 'x', startTime: 0, duration: 5 },
    ])
    expect(out.rows).toHaveLength(1)
    expect(out.rows[0].depth).toBe(0)
  })
  it('computes start/width fractions over the trace duration', () => {
    const layout = layoutSpans(sampleSpans)
    // trace runs 0..100, so root spans full width starting at 0.
    expect(layout.rows[0].startFraction).toBe(0)
    expect(layout.rows[0].widthFraction).toBe(1)
    // child b: start 5, dur 20 → 0.05 / 0.20 fractions
    expect(layout.rows[1].startFraction).toBeCloseTo(0.05)
    expect(layout.rows[1].widthFraction).toBeCloseTo(0.2)
  })
  it('restricts output to a subtree when rootSpanId is provided', () => {
    const layout = layoutSpans(sampleSpans, 'c')
    expect(layout.rows.map((r) => r.span.id)).toEqual(['c', 'd'])
    expect(layout.rows[0].depth).toBe(0)
    expect(layout.rows[1].depth).toBe(1)
  })
  it('returns an empty layout for an empty input', () => {
    const layout = layoutSpans([])
    expect(layout.rows).toEqual([])
    expect(layout.traceDuration).toBe(1)
  })
  it('clamps traceDuration to a positive value when all spans collapse to a point', () => {
    const layout = layoutSpans([{ id: 'a', name: 'a', startTime: 5, duration: 0 }])
    expect(layout.traceDuration).toBe(1)
  })
})

describe('<TraceWaterfall>', () => {
  it('renders a region with the expected aria-label', () => {
    const { container } = render(
      <Wrap>
        <TraceWaterfall spans={sampleSpans} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="trace-waterfall"]')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('region')
    expect(root?.getAttribute('aria-label')).toBe('Distributed trace waterfall')
  })

  it('renders one row per span', () => {
    const { container } = render(
      <Wrap>
        <TraceWaterfall spans={sampleSpans} />
      </Wrap>,
    )
    const rows = container.querySelectorAll('[data-mol-id="trace-waterfall-row"]')
    expect(rows).toHaveLength(4)
  })

  it('renders the time axis with multiple ticks', () => {
    const { container } = render(
      <Wrap>
        <TraceWaterfall spans={sampleSpans} />
      </Wrap>,
    )
    const ticks = container.querySelectorAll('[data-mol-id="trace-waterfall-axis-tick"]')
    expect(ticks.length).toBeGreaterThanOrEqual(2)
  })

  it('renders a service tag with a color when service is present', () => {
    const { container } = render(
      <Wrap>
        <TraceWaterfall spans={sampleSpans} />
      </Wrap>,
    )
    const tags = container.querySelectorAll('[data-mol-id="trace-waterfall-service-tag"]')
    expect(tags.length).toBe(4)
    const first = tags[0] as HTMLElement
    expect(first.style.background).not.toBe('')
  })

  it('omits the service tag when service is missing', () => {
    const { container } = render(
      <Wrap>
        <TraceWaterfall spans={[{ id: 'solo', name: 'lone', startTime: 0, duration: 10 }]} />
      </Wrap>,
    )
    const tags = container.querySelectorAll('[data-mol-id="trace-waterfall-service-tag"]')
    expect(tags).toHaveLength(0)
  })

  it('uses the error color for spans with status="error"', () => {
    const { container } = render(
      <Wrap>
        <TraceWaterfall
          spans={[{ id: 'a', name: 'boom', startTime: 0, duration: 10, status: 'error' }]}
        />
      </Wrap>,
    )
    const bar = container.querySelector('[data-mol-id="trace-waterfall-bar"]') as HTMLElement
    expect(bar.style.background).toBe('rgb(239, 68, 68)')
  })

  it('positions bars by start fraction and width fraction', () => {
    const { container } = render(
      <Wrap>
        <TraceWaterfall spans={sampleSpans} />
      </Wrap>,
    )
    const bars = container.querySelectorAll('[data-mol-id="trace-waterfall-bar"]')
    // sampleSpans[1] = b: startTime 5 / duration 20 / total 100 → left 5%, width 20%
    const bBar = bars[1] as HTMLElement
    expect(bBar.style.left).toBe('5%')
    expect(bBar.style.width).toBe('20%')
  })

  it('calls onSpanClick with the clicked span', () => {
    const onSpanClick = vi.fn()
    const { container } = render(
      <Wrap>
        <TraceWaterfall spans={sampleSpans} onSpanClick={onSpanClick} />
      </Wrap>,
    )
    const row = container.querySelector('[data-span-id="b"]') as HTMLElement
    fireEvent.click(row)
    expect(onSpanClick).toHaveBeenCalledTimes(1)
    expect(onSpanClick.mock.calls[0][0].id).toBe('b')
  })

  it('is keyboard-activatable when interactive', () => {
    const onSpanClick = vi.fn()
    const { container } = render(
      <Wrap>
        <TraceWaterfall spans={sampleSpans} onSpanClick={onSpanClick} />
      </Wrap>,
    )
    const row = container.querySelector('[data-span-id="c"]') as HTMLElement
    expect(row.getAttribute('tabindex')).toBe('0')
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(onSpanClick).toHaveBeenCalledTimes(1)
    expect(onSpanClick.mock.calls[0][0].id).toBe('c')
  })

  it('restricts the rendered subtree to rootSpanId when provided', () => {
    const { container } = render(
      <Wrap>
        <TraceWaterfall spans={sampleSpans} rootSpanId="c" />
      </Wrap>,
    )
    const rows = container.querySelectorAll('[data-mol-id="trace-waterfall-row"]')
    expect(rows).toHaveLength(2)
    const ids = Array.from(rows).map((r) => r.getAttribute('data-span-id'))
    expect(ids).toEqual(['c', 'd'])
  })

  it('renders the empty fallback when there are no spans', () => {
    const { container } = render(
      <Wrap>
        <TraceWaterfall spans={[]} />
      </Wrap>,
    )
    const empty = container.querySelector('[data-mol-id="trace-waterfall-empty"]')
    expect(empty).not.toBeNull()
    expect(empty?.textContent).toContain('No spans')
  })

  it('honors a custom emptyState', () => {
    const { getByTestId, container } = render(
      <Wrap>
        <TraceWaterfall spans={[]} emptyState={<div data-testid="custom-empty">no data</div>} />
      </Wrap>,
    )
    expect(getByTestId('custom-empty')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="trace-waterfall-empty"]')).toBeNull()
  })
})
