// @vitest-environment jsdom
/**
 * Unit tests of `ClassSchedule` — the port of
 * `@molecule/app-class-schedule-react`'s own suite: the same test names and the
 * same behavioral assertions, mounted through Angular's real renderer (a JIT
 * host template, the way an app uses the component) and asserted on the markup
 * the component produces.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { ClassSchedule } from '../class-schedule.component.js'
import { assignLanes, formatHourLabel } from '../helpers.js'
import type { ScheduleEvent } from '../types.js'

/** One recorded callback invocation. */
interface RecordedCall {
  name: string
  args: unknown[]
}

/** A mounted spec host: its DOM, a props setter, the recorded calls, a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** The callback calls the host recorded. */
  readonly calls: RecordedCall[]
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Flushes change detection (a provider notification alone does not tick zoneless CD). */
  refresh(): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

/**
 * Mounts the standalone component through a JIT host template.
 *
 * @param props - The props the host template binds.
 * @param outputs - The outputs the host listens for (React's handler props:
 *   a handler is set exactly when the host binds its output — the component
 *   gates its slot buttons and event-tile buttons on `EventEmitter.observed`).
 * @returns The mounted host.
 */
async function mount(
  props: Record<string, unknown> = {},
  outputs: string[] = ['onEventClick', 'onSlotClick'],
): Promise<Mounted> {
  const calls: RecordedCall[] = []
  const bindings = outputs
    .map((o) => `(${o === 'onEventClick' ? 'eventClick' : 'slotClick'})="record('${o}', $event)"`)
    .join('\n      ')
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ClassSchedule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div mol-class-schedule
      [events]="p['events']"
      [weekStartsOn]="p['weekStartsOn']"
      [dayHours]="p['dayHours']"
      [cellHeight]="p['cellHeight']"
      [showWeekendCols]="p['showWeekendCols']"
      [locale]="p['locale']"
      [className]="p['className']"
      ${bindings}
    ></div>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props

      /**
       * Records one callback call.
       *
       * @param name - The React callback name.
       * @param arg - The emitted payload.
       */
      record(name: string, arg: unknown): void {
        calls.push({ name, args: [arg] })
      }
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
  const result: Mounted = {
    host,
    calls,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    refresh: async () => {
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(result)
  return result
}

/**
 * The component's root element inside the host.
 *
 * @param host - The host element.
 * @returns The `div[mol-class-schedule]` element.
 */
const root = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector<HTMLElement>('[mol-class-schedule]')
  if (!el) throw new Error('no ClassSchedule host rendered')
  return el
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

  it('renders the schedule region with an aria-label', async () => {
    const { host } = await mount({ events })
    const grid = root(host)
    // A `group`, not a `grid`: the layout is a CSS grid with no rows and no
    // grid keyboard model, so `role="grid"` would promise one.
    expect(grid.getAttribute('role')).toBe('group')
    expect(grid.getAttribute('aria-label')).toBe('Weekly class schedule')
    expect(grid.getAttribute('data-mol-id')).toBe('class-schedule')
  })

  it('names each day column by its weekday header', async () => {
    const { host } = await mount({ events })
    const header = host.querySelector<HTMLElement>(
      '[data-mol-id="class-schedule-day-header"][data-weekday="1"]',
    )!
    // A generated id (a per-instance counter), carried by the header and named by its column.
    expect(header.id).not.toBe('')
    const column = host.querySelector<HTMLElement>(
      '[data-mol-id="class-schedule-day-column"][data-weekday="1"]',
    )!
    expect(column.getAttribute('role')).toBe('group')
    expect(column.getAttribute('aria-labelledby')).toBe(header.id)
    expect(column.getAttribute('aria-label')).toBeNull()
    expect(header.textContent?.trim()).toBe('Mon')
    expect(header.getAttribute('role')).toBeNull()
  })

  it('renders 7 day columns by default', async () => {
    const { host } = await mount({ events })
    expect(host.querySelectorAll('[data-mol-id="class-schedule-day-column"]')).toHaveLength(7)
  })

  it('renders 5 day columns when showWeekendCols=false', async () => {
    const { host } = await mount({ events, showWeekendCols: false })
    expect(host.querySelectorAll('[data-mol-id="class-schedule-day-column"]')).toHaveLength(5)
  })

  it('renders one hour-row label per visible hour', async () => {
    const { host } = await mount({ events, dayHours: [8, 12] })
    const labels = host.querySelectorAll('[data-mol-id="class-schedule-hour-label"]')
    expect(labels).toHaveLength(4)
    expect(labels[0].textContent?.trim()).toBe('08:00')
    expect(labels[3].textContent?.trim()).toBe('11:00')
  })

  it('renders an event tile per provided event', async () => {
    const { host } = await mount({ events })
    const tiles = host.querySelectorAll('[data-mol-id="class-schedule-event"]')
    expect(tiles).toHaveLength(2)
    expect(tiles[0].getAttribute('data-event-id')).toBe('math')
  })

  it('an event tile without onEventClick is static content, not a button', async () => {
    // No output bound: no `onEventClick` handler is set (React parity).
    const { host } = await mount({ events }, [])
    const tiles = host.querySelectorAll('[data-mol-id="class-schedule-event"]')
    expect(tiles).toHaveLength(2)
    for (const tile of tiles) {
      expect(tile.tagName).toBe('DIV')
      expect(tile.getAttribute('aria-label')).toBeNull()
    }
    expect(host.querySelectorAll('[data-mol-id="class-schedule-slot"]')).toHaveLength(0)
  })

  it('an event tile with onEventClick is a button named by its content, ending in the time', async () => {
    const { host } = await mount({ events: [events[0]], onEventClick: (): void => {} }, [
      'onEventClick',
    ])
    const tile = host.querySelector('[data-mol-id="class-schedule-event"]')!
    expect(tile.tagName).toBe('BUTTON')
    expect(tile.getAttribute('aria-label')).toBeNull()
    // The time run is the tile's last child (its `srOnly` class comes from the
    // real ClassMap bond — the conformance goldens pin it).
    const timeRun = tile.lastElementChild as HTMLElement
    expect(timeRun.tagName).toBe('SPAN')
    expect(timeRun.textContent?.trim()).toBe('Mon 09:00 – 10:00')
    expect(tile.textContent?.includes('Math')).toBe(true)
  })

  it('renders slot buttons only while onSlotClick is set', async () => {
    const onSlotClick = vi.fn()
    const withHandler = await mount({ events: [], onSlotClick, dayHours: [9, 11] }, ['onSlotClick'])
    expect(withHandler.host.querySelectorAll('[data-mol-id="class-schedule-slot"]')).toHaveLength(
      2 * 7,
    )
    const withoutHandler = await mount({ events: [], dayHours: [9, 11] }, [])
    expect(
      withoutHandler.host.querySelectorAll('[data-mol-id="class-schedule-slot"]'),
    ).toHaveLength(0)
  })

  it('renders title, subtitle, and meta lines on the tile', async () => {
    const { host } = await mount({ events })
    expect(
      host.querySelector('[data-mol-id="class-schedule-event-title"]')?.textContent?.trim(),
    ).toBe('Math')
    expect(
      host.querySelector('[data-mol-id="class-schedule-event-subtitle"]')?.textContent?.trim(),
    ).toBe('Room 4B')
    expect(
      host.querySelector('[data-mol-id="class-schedule-event-meta"]')?.textContent?.trim(),
    ).toBe('Mr. Smith')
  })

  it('draws an accentColor as the inset accent bar (never a border-left) and colors the meta caption', async () => {
    const { host } = await mount({ events: [{ ...events[0], accentColor: '#ff0000' }, events[1]] })
    const tiles = host.querySelectorAll<HTMLElement>('[data-mol-id="class-schedule-event"]')
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

  it('fires onEventClick when an event tile is clicked', async () => {
    const m = await mount({ events })
    ;(m.host.querySelector('[data-event-id="math"]') as HTMLElement).click()
    expect(m.calls).toHaveLength(1)
    expect(m.calls[0].name).toBe('onEventClick')
    expect((m.calls[0].args[0] as ScheduleEvent).id).toBe('math')
  })

  it('fires onSlotClick when an empty grid cell is clicked', async () => {
    const m = await mount({ events: [], dayHours: [9, 11] })
    const slot = m.host.querySelector(
      '[data-mol-id="class-schedule-slot"][data-weekday="2"][data-start="600"]',
    ) as HTMLElement
    expect(slot).not.toBeNull()
    slot.click()
    expect(m.calls).toHaveLength(1)
    expect(m.calls[0].name).toBe('onSlotClick')
    expect(m.calls[0].args[0]).toEqual({ weekday: 2, start: 600 })
  })

  it('clicking a slot does NOT fire onEventClick (and vice versa)', async () => {
    const m = await mount({ events })
    ;(m.host.querySelector('[data-event-id="math"]') as HTMLElement).click()
    expect(m.calls.filter((c) => c.name === 'onEventClick')).toHaveLength(1)
    expect(m.calls.filter((c) => c.name === 'onSlotClick')).toHaveLength(0)

    m.calls.length = 0
    m.host.querySelectorAll<HTMLElement>('[data-mol-id="class-schedule-slot"]')[0].click()
    expect(m.calls.filter((c) => c.name === 'onSlotClick')).toHaveLength(1)
    expect(m.calls.filter((c) => c.name === 'onEventClick')).toHaveLength(0)
  })

  it('stacks two overlapping events side-by-side at half width', async () => {
    const overlapping: ScheduleEvent[] = [
      { id: 'a', weekday: 1, start: 9 * 60, end: 10 * 60 + 30, title: 'A' },
      { id: 'b', weekday: 1, start: 10 * 60, end: 11 * 60, title: 'B' },
    ]
    const { host } = await mount({ events: overlapping })
    const tiles = host.querySelectorAll(
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

  it('positions an event by start/end relative to the visible hour range', async () => {
    const single: ScheduleEvent[] = [
      { id: 'mid', weekday: 1, start: 10 * 60, end: 11 * 60, title: 'Mid' },
    ]
    const { host } = await mount({ events: single, dayHours: [9, 13], cellHeight: 60 })
    const tile = host.querySelector('[data-mol-id="class-schedule-event"]') as HTMLElement
    // Hour range = 4h × 60px = 240px total. 10:00 starts at 1h offset = 60px.
    expect(tile.style.top).toBe('60px')
    expect(tile.style.height).toBe('60px')
  })

  it('omits events whose weekday is hidden by showWeekendCols=false', async () => {
    const weekend: ScheduleEvent[] = [
      { id: 'sat', weekday: 6, start: 10 * 60, end: 11 * 60, title: 'Sat' },
    ]
    const { host } = await mount({ events: weekend, showWeekendCols: false })
    expect(host.querySelectorAll('[data-mol-id="class-schedule-event"]')).toHaveLength(0)
  })

  it("renders weekday headers in the provider's active locale, and re-words them on a switch", async () => {
    const provider = createSimpleI18nProvider('en', [{ code: 'de', name: 'Deutsch' }])
    setProvider(provider)
    const { host, refresh } = await mount({ events })
    const header = (weekday: number): string | null =>
      host
        .querySelector(`[data-mol-id="class-schedule-day-header"][data-weekday="${weekday}"]`)
        ?.textContent?.trim() ?? null
    expect(header(1)).toBe('Mon')
    await provider.setLocale('de')
    await refresh()
    expect(header(1)).toBe('Mo')
  })

  it('an explicit locale prop overrides the active locale', async () => {
    const provider = createSimpleI18nProvider('en', [{ code: 'de', name: 'Deutsch' }])
    setProvider(provider)
    const { host, refresh } = await mount({ events, locale: 'nl' })
    const monday = host.querySelector('[data-mol-id="class-schedule-day-header"][data-weekday="1"]')
    expect(monday?.textContent?.trim()).toBe('ma')
    await provider.setLocale('de')
    await refresh()
    expect(monday?.textContent?.trim()).toBe('ma')
  })
})
