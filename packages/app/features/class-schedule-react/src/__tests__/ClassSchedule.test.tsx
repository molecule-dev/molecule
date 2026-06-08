// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import {
  assignLanes,
  ClassSchedule,
  formatHourLabel,
  type ScheduleEvent,
} from '../ClassSchedule.js'

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
 * Wrap children in `I18nProvider` so `useTranslation()` works.
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

describe('formatHourLabel', () => {
  it('formats hours and minutes with zero-padding', () => {
    expect(formatHourLabel(0)).toBe('00:00')
    expect(formatHourLabel(540)).toBe('09:00')
    expect(formatHourLabel(545)).toBe('09:05')
    expect(formatHourLabel(13 * 60 + 30)).toBe('13:30')
  })
})

describe('assignLanes', () => {
  it('assigns lane 0 / lanes 1 to non-overlapping events', () => {
    const result = assignLanes([
      { start: 540, end: 600 },
      { start: 660, end: 720 },
    ])
    expect(result).toEqual([
      { event: { start: 540, end: 600 }, lane: 0, lanes: 1 },
      { event: { start: 660, end: 720 }, lane: 0, lanes: 1 },
    ])
  })

  it('splits two overlapping events into lanes 0 and 1', () => {
    const result = assignLanes([
      { start: 540, end: 660 },
      { start: 600, end: 720 },
    ])
    expect(result).toHaveLength(2)
    expect(result[0].lanes).toBe(2)
    expect(result[1].lanes).toBe(2)
    const lanes = result.map((r) => r.lane).sort()
    expect(lanes).toEqual([0, 1])
  })

  it('reuses lane 0 after the previous group ends', () => {
    const result = assignLanes([
      { start: 540, end: 600 },
      { start: 555, end: 595 },
      { start: 720, end: 780 },
    ])
    const reuse = result.find((r) => r.event.start === 720)!
    expect(reuse.lane).toBe(0)
    expect(reuse.lanes).toBe(1)
  })

  it('preserves input order in the returned array', () => {
    const result = assignLanes([
      { start: 600, end: 720 },
      { start: 540, end: 660 },
    ])
    expect(result[0].event.start).toBe(600)
    expect(result[1].event.start).toBe(540)
  })
})

describe('<ClassSchedule>', () => {
  const events: ScheduleEvent[] = [
    {
      id: 'math',
      weekday: 1,
      start: 9 * 60,
      end: 10 * 60,
      title: 'Math',
      subtitle: 'Room 4B',
      meta: 'Mr. Smith',
    },
    { id: 'eng', weekday: 3, start: 11 * 60, end: 12 * 60, title: 'English' },
  ]

  it('renders the schedule region with an aria-label', () => {
    const { getByRole } = render(
      <Wrap>
        <ClassSchedule events={events} />
      </Wrap>,
    )
    const grid = getByRole('grid')
    expect(grid.getAttribute('aria-label')).toBe('Weekly class schedule')
    expect(grid.getAttribute('data-mol-id')).toBe('class-schedule')
  })

  it('renders 7 day columns by default', () => {
    const { container } = render(
      <Wrap>
        <ClassSchedule events={events} />
      </Wrap>,
    )
    expect(container.querySelectorAll('[data-mol-id="class-schedule-day-column"]')).toHaveLength(7)
  })

  it('renders 5 day columns when showWeekendCols=false', () => {
    const { container } = render(
      <Wrap>
        <ClassSchedule events={events} showWeekendCols={false} />
      </Wrap>,
    )
    expect(container.querySelectorAll('[data-mol-id="class-schedule-day-column"]')).toHaveLength(5)
  })

  it('renders one hour-row label per visible hour', () => {
    const { container } = render(
      <Wrap>
        <ClassSchedule events={events} dayHours={[8, 12]} />
      </Wrap>,
    )
    const labels = container.querySelectorAll('[data-mol-id="class-schedule-hour-label"]')
    expect(labels).toHaveLength(4)
    expect(labels[0].textContent).toBe('08:00')
    expect(labels[3].textContent).toBe('11:00')
  })

  it('renders an event tile per provided event', () => {
    const { container } = render(
      <Wrap>
        <ClassSchedule events={events} />
      </Wrap>,
    )
    const tiles = container.querySelectorAll('[data-mol-id="class-schedule-event"]')
    expect(tiles).toHaveLength(2)
    expect(tiles[0].getAttribute('data-event-id')).toBe('math')
  })

  it('renders title, subtitle, and meta lines on the tile', () => {
    const { container } = render(
      <Wrap>
        <ClassSchedule events={events} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="class-schedule-event-title"]')?.textContent).toBe(
      'Math',
    )
    expect(
      container.querySelector('[data-mol-id="class-schedule-event-subtitle"]')?.textContent,
    ).toBe('Room 4B')
    expect(container.querySelector('[data-mol-id="class-schedule-event-meta"]')?.textContent).toBe(
      'Mr. Smith',
    )
  })

  it('fires onEventClick when an event tile is clicked', () => {
    const onEventClick = vi.fn()
    const { container } = render(
      <Wrap>
        <ClassSchedule events={events} onEventClick={onEventClick} />
      </Wrap>,
    )
    fireEvent.click(container.querySelector('[data-event-id="math"]')!)
    expect(onEventClick).toHaveBeenCalledTimes(1)
    expect(onEventClick.mock.calls[0][0].id).toBe('math')
  })

  it('fires onSlotClick when an empty grid cell is clicked', () => {
    const onSlotClick = vi.fn()
    const { container } = render(
      <Wrap>
        <ClassSchedule events={[]} onSlotClick={onSlotClick} dayHours={[9, 11]} />
      </Wrap>,
    )
    const slot = container.querySelector(
      '[data-mol-id="class-schedule-slot"][data-weekday="2"][data-start="600"]',
    ) as HTMLElement
    expect(slot).not.toBeNull()
    fireEvent.click(slot)
    expect(onSlotClick).toHaveBeenCalledTimes(1)
    expect(onSlotClick.mock.calls[0][0]).toEqual({ weekday: 2, start: 600 })
  })

  it('clicking a slot does NOT fire onEventClick (and vice versa)', () => {
    const onEventClick = vi.fn()
    const onSlotClick = vi.fn()
    const { container } = render(
      <Wrap>
        <ClassSchedule events={events} onEventClick={onEventClick} onSlotClick={onSlotClick} />
      </Wrap>,
    )
    fireEvent.click(container.querySelector('[data-event-id="math"]')!)
    expect(onEventClick).toHaveBeenCalledTimes(1)
    expect(onSlotClick).not.toHaveBeenCalled()

    onEventClick.mockClear()
    onSlotClick.mockClear()
    fireEvent.click(container.querySelectorAll('[data-mol-id="class-schedule-slot"]')[0])
    expect(onSlotClick).toHaveBeenCalledTimes(1)
    expect(onEventClick).not.toHaveBeenCalled()
  })

  it('stacks two overlapping events side-by-side at half width', () => {
    const overlapping: ScheduleEvent[] = [
      { id: 'a', weekday: 1, start: 9 * 60, end: 10 * 60 + 30, title: 'A' },
      { id: 'b', weekday: 1, start: 10 * 60, end: 11 * 60, title: 'B' },
    ]
    const { container } = render(
      <Wrap>
        <ClassSchedule events={overlapping} />
      </Wrap>,
    )
    const tiles = container.querySelectorAll(
      '[data-mol-id="class-schedule-event"]',
    ) as NodeListOf<HTMLElement>
    expect(tiles).toHaveLength(2)
    // Each tile should claim ~50% width via calc(50% - 4px).
    expect(tiles[0].style.width).toContain('50%')
    expect(tiles[1].style.width).toContain('50%')
    // Different left offsets — one starts at 0%, the other at 50%.
    const lefts = [tiles[0].style.left, tiles[1].style.left].sort()
    expect(lefts[0]).toContain('0%')
    expect(lefts[1]).toContain('50%')
  })

  it('positions an event by start/end relative to the visible hour range', () => {
    const single: ScheduleEvent[] = [
      { id: 'mid', weekday: 1, start: 10 * 60, end: 11 * 60, title: 'Mid' },
    ]
    const { container } = render(
      <Wrap>
        <ClassSchedule events={single} dayHours={[9, 13]} cellHeight={60} />
      </Wrap>,
    )
    const tile = container.querySelector('[data-mol-id="class-schedule-event"]') as HTMLElement
    // Hour range = 4h × 60px = 240px total. 10:00 starts at 1h offset = 60px.
    expect(tile.style.top).toBe('60px')
    expect(tile.style.height).toBe('60px')
  })

  it('omits events whose weekday is hidden by showWeekendCols=false', () => {
    const weekend: ScheduleEvent[] = [
      { id: 'sat', weekday: 6, start: 10 * 60, end: 11 * 60, title: 'Sat' },
    ]
    const { container } = render(
      <Wrap>
        <ClassSchedule events={weekend} showWeekendCols={false} />
      </Wrap>,
    )
    expect(container.querySelectorAll('[data-mol-id="class-schedule-event"]')).toHaveLength(0)
  })
})
