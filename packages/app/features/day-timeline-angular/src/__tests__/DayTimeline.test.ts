// @vitest-environment jsdom
/**
 * Unit tests of `DayTimeline` — the port of
 * `@molecule/app-day-timeline-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup.
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

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    textSize: () => 'text',
    fontWeight: () => 'fw',
    accentCard: () => 'accent-card',
    accentCardLabel: () => 'accent-card-label',
    textMuted: 'muted',
    borderL: 'border-l',
    bgBorder: 'bg-border',
    surfaceSecondary: 'surface-secondary',
  }),
}))

vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      let s = opts?.defaultValue ?? _key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          s = s.replaceAll(`{{${k}}}`, String(v))
        }
      }
      return s
    },
  }),
}))

const { DayTimeline, formatHour } = await import('../day-timeline.component.js')

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
 * Mounts the component through a JIT host template, written exactly the way
 * an Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [DayTimeline as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    // prettier-ignore
    template: `<div mol-day-timeline [events]="p['events']" [startHour]="p['startHour']" [endHour]="p['endHour']" [pxPerHour]="p['pxPerHour']" [showAxisLabels]="p['showAxisLabels']" [dataMolId]="p['dataMolId']" [className]="p['className']"></div>`,
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

/** The component element (`div[mol-day-timeline]`), which is React's root. */
const rootEl = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector('[mol-day-timeline]')
  if (!el) throw new Error('no DayTimeline host rendered')
  return el as HTMLElement
}

const mounted: Mounted[] = []

const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('formatHour', () => {
  it('formats whole hours with AM/PM', () => {
    expect(formatHour(0)).toBe('12 AM')
    expect(formatHour(9)).toBe('9 AM')
    expect(formatHour(12)).toBe('12 PM')
    expect(formatHour(15)).toBe('3 PM')
    expect(formatHour(23)).toBe('11 PM')
  })

  it('formats half-hours with minutes', () => {
    expect(formatHour(9.5)).toBe('9:30 AM')
    expect(formatHour(13.25)).toBe('1:15 PM')
  })
})

describe('<DayTimeline>', () => {
  it('renders no events when given an empty list', async () => {
    const m = await render({ events: [] })
    expect(m.host.querySelectorAll('[data-event-id]')).toHaveLength(0)
  })

  it('renders one card per event with stable data-event-id', async () => {
    const m = await render({
      events: [
        { id: 'a', title: 'Stand-up', startHour: 9, endHour: 9.5 },
        { id: 'b', title: 'Lunch', startHour: 12, endHour: 13 },
      ],
    })
    expect(m.host.querySelectorAll('[data-event-id]')).toHaveLength(2)
    expect(m.host.querySelector('[data-event-id="a"]')).not.toBeNull()
    expect(m.host.querySelector('[data-event-id="b"]')).not.toBeNull()
  })

  it('positions events vertically by startHour', async () => {
    const m = await render({
      startHour: 0,
      endHour: 24,
      pxPerHour: 60,
      events: [
        { id: 'morning', title: 'Morning', startHour: 9, endHour: 10 },
        { id: 'evening', title: 'Evening', startHour: 18, endHour: 19 },
      ],
    })
    const morning = m.host.querySelector('[data-event-id="morning"]') as HTMLElement
    const evening = m.host.querySelector('[data-event-id="evening"]') as HTMLElement
    expect(morning.style.top).toBe('540px') // 9 * 60
    expect(evening.style.top).toBe('1080px') // 18 * 60
  })

  it('sizes events by duration × pxPerHour', async () => {
    const m = await render({
      pxPerHour: 50,
      events: [{ id: 'block', title: 'Block', startHour: 10, endHour: 12 }],
    })
    const block = m.host.querySelector('[data-event-id="block"]') as HTMLElement
    expect(block.style.height).toBe('100px') // 2h * 50
  })

  it('renders an axis tick per hour in the visible window', async () => {
    const m = await render({ startHour: 9, endHour: 12, events: [] })
    expect(m.host.querySelectorAll('[data-axis-tick]')).toHaveLength(3)
    // Neutral surfaces come from the theme: muted tick text, a theme-border
    // gridline, and the rail divider only while the axis shows.
    const tick = m.host.querySelector('[data-axis-tick]') as HTMLElement
    expect(tick.className).toContain('muted')
    const rail = m.host.querySelector('[data-mol-id="day-timeline-rail"]') as HTMLElement
    expect(rail.className).toContain('border-l')
    const gridline = rail.querySelector('[aria-hidden]') as HTMLElement
    expect(gridline.className).toContain('bg-border')
  })

  it('hides axis labels when showAxisLabels=false', async () => {
    const m = await render({ showAxisLabels: false, startHour: 9, endHour: 12, events: [] })
    expect(m.host.querySelectorAll('[data-axis-tick]')).toHaveLength(0)
    // No axis, no rail divider.
    const rail = m.host.querySelector('[data-mol-id="day-timeline-rail"]') as HTMLElement
    expect(rail.className).not.toContain('border-l')
  })

  it('honors the startHour/endHour viewport when positioning events', async () => {
    const m = await render({
      startHour: 6,
      endHour: 20,
      pxPerHour: 60,
      events: [{ id: 'noon', title: 'Noon', startHour: 12, endHour: 13 }],
    })
    const noon = m.host.querySelector('[data-event-id="noon"]') as HTMLElement
    // (12 - 6) * 60 = 360
    expect(noon.style.top).toBe('360px')
  })

  it('forwards the click of the card button, leaving Enter/Space to the native button', async () => {
    const onClick = vi.fn()
    const m = await render({
      events: [{ id: 'tap', title: 'Tap me', startHour: 10, endHour: 11, onClick }],
    })
    const action = m.host.querySelector('[data-mol-id="day-timeline-event-action"]') as HTMLElement
    expect(action.tagName).toBe('BUTTON')
    expect((action as HTMLButtonElement).type).toBe('button')
    action.click()
    expect(onClick).toHaveBeenCalledTimes(1)
    // A native button turns Enter / Space into that click itself, so the event has
    // no key handler; jsdom does not synthesize that click.
    action.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    action.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('exposes clickable events as real buttons with an accessible name', async () => {
    const m = await render({
      events: [{ id: 'flight', title: 'Flight', startHour: 13, endHour: 16, onClick: () => {} }],
    })
    const button = rootEl(m.host).querySelector('button') as HTMLButtonElement
    expect(button.getAttribute('aria-label')).toBe('Flight from 1 PM to 4 PM')
  })

  it('keeps non-clickable events inert: no button, no focusable control', async () => {
    const m = await render({
      events: [{ id: 'fixed', title: 'Fixed', startHour: 8, endHour: 9 }],
    })
    const card = m.host.querySelector('[data-event-id="fixed"]') as HTMLElement
    expect(card.querySelector('button')).toBeNull()
    expect(card.querySelector('[role="button"]')).toBeNull()
    expect(card.getAttribute('tabindex')).toBeNull()
    // The card still paints its content.
    expect(card.textContent).toContain('Fixed')
  })

  it('paints a per-event accent color as the inset accent bar, never a border-left', async () => {
    const m = await render({
      events: [
        {
          id: 'red',
          title: 'Red',
          subtitle: 'Room 4',
          startHour: 9,
          endHour: 10,
          accentColor: '#ff0000',
        },
        { id: 'plain', title: 'Plain', startHour: 11, endHour: 12 },
      ],
    })
    const red = m.host.querySelector('[data-event-id="red"]') as HTMLElement
    expect(red.className).toContain('accent-card')
    expect(red.className).toContain('surface-secondary')
    expect(red.style.getPropertyValue('--mol-accent')).toBe('#ff0000')
    expect(red.style.borderLeft).toBe('')
    // The caption takes the bar's color through the label recipe.
    expect(red.querySelector('.accent-card-label')?.textContent).toBe('Room 4')
    // Without an accent color the bar is the brand primary: the recipe's
    // primary tone, and no data color is set.
    const plain = m.host.querySelector('[data-event-id="plain"]') as HTMLElement
    expect(plain.style.getPropertyValue('--mol-accent')).toBe('')
    expect(plain.className).toContain('accent-card')
    expect(plain.className).toContain('surface-secondary')
  })

  it('translates the event aria-label with title and times', async () => {
    const m = await render({
      events: [{ id: 'a', title: 'Flight', startHour: 13, endHour: 16 }],
    })
    const ev = m.host.querySelector('[data-event-id="a"]') as HTMLElement
    expect(ev.getAttribute('aria-label')).toBe('Flight from 1 PM to 4 PM')
  })

  it('forwards dataMolId for agent automation', async () => {
    const m = await render({ dataMolId: 'trip-day-1', events: [] })
    expect(rootEl(m.host).getAttribute('data-mol-id')).toBe('trip-day-1')
  })

  it('exposes role="list" and "listitem" for accessibility', async () => {
    const m = await render({
      events: [{ id: 'a', title: 'A', startHour: 9, endHour: 10 }],
    })
    expect(rootEl(m.host).getAttribute('role')).toBe('list')
    expect(m.host.querySelectorAll('[role="listitem"]')).toHaveLength(1)
  })
})
