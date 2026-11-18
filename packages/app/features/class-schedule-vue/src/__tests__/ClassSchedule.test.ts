// @vitest-environment jsdom
/**
 * Unit tests for the Vue `ClassSchedule` — a port of
 * `@molecule/app-class-schedule-react/src/__tests__/ClassSchedule.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with Vue in
 * jsdom and asserted on the markup the component produces.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `accentCard`), so tests can assert which cm.* call was applied without a real
// bond — the same stub the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
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
    return new Proxy({}, handler)
  },
}))

import { type App, createApp, defineComponent, h, nextTick } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { ClassSchedule } from '../ClassSchedule.js'
import { assignLanes, formatHourLabel } from '../helpers.js'
import type { ClassScheduleProps, ScheduleEvent } from '../types.js'

/** Mounted apps, unmounted after each test. */
const apps: App[] = []

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
})

/**
 * Renders a {@link ClassSchedule} and returns the element it mounted into.
 *
 * @param props - The schedule props.
 * @returns The host element holding the rendered schedule.
 */
function render(props: ClassScheduleProps): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(ClassSchedule, props) }))
  app.mount(host)
  apps.push(app)
  return host
}

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
    // A `group`, not a `grid`: the layout is a CSS grid with no rows and no
    // grid keyboard model, so `role="grid"` would promise one.
    const grid = render({ events }).querySelector('[role="group"]')!
    expect(grid.getAttribute('aria-label')).toBe('Weekly class schedule')
    expect(grid.getAttribute('data-mol-id')).toBe('class-schedule')
  })

  it('names each day column by its weekday header', () => {
    const container = render({ events })
    const header = container.querySelector<HTMLElement>(
      '[data-mol-id="class-schedule-day-header"][data-weekday="1"]',
    )!
    // A generated id (Vue's useId), carried by the header and named by its column.
    expect(header.id).not.toBe('')
    const column = container.querySelector<HTMLElement>(
      '[data-mol-id="class-schedule-day-column"][data-weekday="1"]',
    )!
    expect(column.getAttribute('role')).toBe('group')
    expect(column.getAttribute('aria-labelledby')).toBe(header.id)
    expect(column.getAttribute('aria-label')).toBeNull()
    expect(header.textContent).toBe('Mon')
    expect(header.getAttribute('role')).toBeNull()
  })

  it('renders 7 day columns by default', () => {
    const container = render({ events })
    expect(container.querySelectorAll('[data-mol-id="class-schedule-day-column"]')).toHaveLength(7)
  })

  it('renders 5 day columns when showWeekendCols=false', () => {
    const container = render({ events, showWeekendCols: false })
    expect(container.querySelectorAll('[data-mol-id="class-schedule-day-column"]')).toHaveLength(5)
  })

  it('renders one hour-row label per visible hour', () => {
    const container = render({ events, dayHours: [8, 12] })
    const labels = container.querySelectorAll('[data-mol-id="class-schedule-hour-label"]')
    expect(labels).toHaveLength(4)
    expect(labels[0].textContent).toBe('08:00')
    expect(labels[3].textContent).toBe('11:00')
  })

  it('renders an event tile per provided event', () => {
    const container = render({ events })
    const tiles = container.querySelectorAll('[data-mol-id="class-schedule-event"]')
    expect(tiles).toHaveLength(2)
    expect(tiles[0].getAttribute('data-event-id')).toBe('math')
  })

  it('an event tile without onEventClick is static content, not a button', () => {
    const container = render({ events })
    const tiles = container.querySelectorAll('[data-mol-id="class-schedule-event"]')
    expect(tiles).toHaveLength(2)
    for (const tile of tiles) {
      expect(tile.tagName).toBe('DIV')
      expect(tile.getAttribute('aria-label')).toBeNull()
    }
    expect(container.querySelectorAll('[data-mol-id="class-schedule-slot"]')).toHaveLength(0)
  })

  it('an event tile with onEventClick is a button named by its content, ending in the time', () => {
    const container = render({ events: [events[0]], onEventClick: () => {} })
    const tile = container.querySelector('[data-mol-id="class-schedule-event"]')!
    expect(tile.tagName).toBe('BUTTON')
    expect(tile.getAttribute('aria-label')).toBeNull()
    // The time run is the tile's last child (its `srOnly` class comes from the
    // real ClassMap bond — the conformance goldens pin it).
    const timeRun = tile.lastElementChild as HTMLElement
    expect(timeRun.tagName).toBe('SPAN')
    expect(timeRun.textContent).toBe('Mon 09:00 – 10:00')
    expect(tile.textContent?.includes('Math')).toBe(true)
  })

  it('renders slot buttons only while onSlotClick is set', () => {
    const onSlotClick = vi.fn()
    const withHandler = render({ events: [], onSlotClick, dayHours: [9, 11] })
    expect(withHandler.querySelectorAll('[data-mol-id="class-schedule-slot"]')).toHaveLength(2 * 7)
    const withoutHandler = render({ events: [], dayHours: [9, 11] })
    expect(withoutHandler.querySelectorAll('[data-mol-id="class-schedule-slot"]')).toHaveLength(0)
  })

  it('renders title, subtitle, and meta lines on the tile', () => {
    const container = render({ events })
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

  it('draws an accentColor as the inset accent bar (never a border-left) and colors the meta caption', () => {
    const container = render({ events: [{ ...events[0], accentColor: '#ff0000' }, events[1]] })
    const tiles = container.querySelectorAll<HTMLElement>('[data-mol-id="class-schedule-event"]')
    const math = Array.from(tiles).find((t) => t.textContent?.includes('Math')) as HTMLElement
    const english = Array.from(tiles).find((t) => t.textContent?.includes('English')) as HTMLElement
    expect(math.className).toContain('accentCard')
    expect(math.style.getPropertyValue('--mol-accent')).toBe('#ff0000')
    expect(math.style.borderLeft).toBe('')
    expect(math.querySelector('[data-mol-id="class-schedule-event-meta"]')?.className).toContain(
      'accentCardLabel',
    )
    // No accentColor: no bar, no variable.
    expect(english.className).not.toContain('accentCard')
    expect(english.style.getPropertyValue('--mol-accent')).toBe('')
  })

  it('fires onEventClick when an event tile is clicked', () => {
    const onEventClick = vi.fn()
    const container = render({ events, onEventClick })
    ;(container.querySelector('[data-event-id="math"]') as HTMLElement).click()
    expect(onEventClick).toHaveBeenCalledTimes(1)
    expect(onEventClick.mock.calls[0][0].id).toBe('math')
  })

  it('fires onSlotClick when an empty grid cell is clicked', () => {
    const onSlotClick = vi.fn()
    const container = render({ events: [], onSlotClick, dayHours: [9, 11] })
    const slot = container.querySelector(
      '[data-mol-id="class-schedule-slot"][data-weekday="2"][data-start="600"]',
    ) as HTMLElement
    expect(slot).not.toBeNull()
    slot.click()
    expect(onSlotClick).toHaveBeenCalledTimes(1)
    expect(onSlotClick.mock.calls[0][0]).toEqual({ weekday: 2, start: 600 })
  })

  it('clicking a slot does NOT fire onEventClick (and vice versa)', () => {
    const onEventClick = vi.fn()
    const onSlotClick = vi.fn()
    const container = render({ events, onEventClick, onSlotClick })
    ;(container.querySelector('[data-event-id="math"]') as HTMLElement).click()
    expect(onEventClick).toHaveBeenCalledTimes(1)
    expect(onSlotClick).not.toHaveBeenCalled()

    onEventClick.mockClear()
    onSlotClick.mockClear()
    container.querySelectorAll<HTMLElement>('[data-mol-id="class-schedule-slot"]')[0].click()
    expect(onSlotClick).toHaveBeenCalledTimes(1)
    expect(onEventClick).not.toHaveBeenCalled()
  })

  it('stacks two overlapping events side-by-side at half width', () => {
    const overlapping: ScheduleEvent[] = [
      { id: 'a', weekday: 1, start: 9 * 60, end: 10 * 60 + 30, title: 'A' },
      { id: 'b', weekday: 1, start: 10 * 60, end: 11 * 60, title: 'B' },
    ]
    const container = render({ events: overlapping })
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
    const container = render({ events: single, dayHours: [9, 13], cellHeight: 60 })
    const tile = container.querySelector('[data-mol-id="class-schedule-event"]') as HTMLElement
    // Hour range = 4h × 60px = 240px total. 10:00 starts at 1h offset = 60px.
    expect(tile.style.top).toBe('60px')
    expect(tile.style.height).toBe('60px')
  })

  it('omits events whose weekday is hidden by showWeekendCols=false', () => {
    const weekend: ScheduleEvent[] = [
      { id: 'sat', weekday: 6, start: 10 * 60, end: 11 * 60, title: 'Sat' },
    ]
    const container = render({ events: weekend, showWeekendCols: false })
    expect(container.querySelectorAll('[data-mol-id="class-schedule-event"]')).toHaveLength(0)
  })

  it("renders weekday headers in the provider's active locale, and re-words them on a switch", async () => {
    const provider = createSimpleI18nProvider('en', [{ code: 'de', name: 'Deutsch' }])
    setProvider(provider)
    const container = render({ events })
    const header = (weekday: number): string | null =>
      container.querySelector(
        `[data-mol-id="class-schedule-day-header"][data-weekday="${weekday}"]`,
      )?.textContent ?? null
    expect(header(1)).toBe('Mon')
    await provider.setLocale('de')
    await nextTick()
    expect(header(1)).toBe('Mo')
  })

  it('an explicit locale prop overrides the active locale', async () => {
    const provider = createSimpleI18nProvider('en', [{ code: 'de', name: 'Deutsch' }])
    setProvider(provider)
    const container = render({ events, locale: 'nl' })
    const monday = container.querySelector(
      '[data-mol-id="class-schedule-day-header"][data-weekday="1"]',
    )
    expect(monday?.textContent).toBe('ma')
    await provider.setLocale('de')
    await nextTick()
    expect(monday?.textContent).toBe('ma')
  })
})
