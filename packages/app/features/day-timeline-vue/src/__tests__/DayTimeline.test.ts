// @vitest-environment jsdom
/**
 * Unit tests for the Vue `DayTimeline` — a port of
 * `@molecule/app-day-timeline-react/src/__tests__/DayTimeline.test.tsx`:
 * the same test names and assertions, rendered with Vue in jsdom.
 *
 * @module
 */

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

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

import { createApp, defineComponent, h } from 'vue'

import { DayTimeline, formatHour } from '../DayTimeline.js'
import type { DayTimelineProps } from '../types.js'

const apps: ReturnType<typeof createApp>[] = []

/**
 * Renders a `DayTimeline` into a fresh container.
 *
 * @param props - The component props (`events` is required, as on the component).
 * @returns The container holding the rendered DOM.
 */
function render(props: DayTimelineProps): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(DayTimeline, props) }))
  app.mount(host)
  apps.push(app)
  return host
}

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
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
  it('renders no events when given an empty list', () => {
    const container = render({ events: [] })
    expect(container.querySelectorAll('[data-event-id]')).toHaveLength(0)
  })

  it('renders one card per event with stable data-event-id', () => {
    const container = render({
      events: [
        { id: 'a', title: 'Stand-up', startHour: 9, endHour: 9.5 },
        { id: 'b', title: 'Lunch', startHour: 12, endHour: 13 },
      ],
    })
    expect(container.querySelectorAll('[data-event-id]')).toHaveLength(2)
    expect(container.querySelector('[data-event-id="a"]')).not.toBeNull()
    expect(container.querySelector('[data-event-id="b"]')).not.toBeNull()
  })

  it('positions events vertically by startHour', () => {
    const container = render({
      startHour: 0,
      endHour: 24,
      pxPerHour: 60,
      events: [
        { id: 'morning', title: 'Morning', startHour: 9, endHour: 10 },
        { id: 'evening', title: 'Evening', startHour: 18, endHour: 19 },
      ],
    })
    const morning = container.querySelector('[data-event-id="morning"]') as HTMLElement
    const evening = container.querySelector('[data-event-id="evening"]') as HTMLElement
    expect(morning.style.top).toBe('540px') // 9 * 60
    expect(evening.style.top).toBe('1080px') // 18 * 60
  })

  it('sizes events by duration × pxPerHour', () => {
    const container = render({
      pxPerHour: 50,
      events: [{ id: 'block', title: 'Block', startHour: 10, endHour: 12 }],
    })
    const block = container.querySelector('[data-event-id="block"]') as HTMLElement
    expect(block.style.height).toBe('100px') // 2h * 50
  })

  it('renders an axis tick per hour in the visible window', () => {
    const container = render({ startHour: 9, endHour: 12, events: [] })
    expect(container.querySelectorAll('[data-axis-tick]')).toHaveLength(3)
    // Neutral surfaces come from the theme: muted tick text, a theme-border
    // gridline, and the rail divider only while the axis shows.
    const tick = container.querySelector('[data-axis-tick]') as HTMLElement
    expect(tick.className).toContain('muted')
    const rail = container.querySelector('[data-mol-id="day-timeline-rail"]') as HTMLElement
    expect(rail.className).toContain('border-l')
    const gridline = rail.querySelector('[aria-hidden]') as HTMLElement
    expect(gridline.className).toContain('bg-border')
  })

  it('hides axis labels when showAxisLabels=false', () => {
    const container = render({ showAxisLabels: false, startHour: 9, endHour: 12, events: [] })
    expect(container.querySelectorAll('[data-axis-tick]')).toHaveLength(0)
    // No axis, no rail divider.
    const rail = container.querySelector('[data-mol-id="day-timeline-rail"]') as HTMLElement
    expect(rail.className).not.toContain('border-l')
  })

  it('honors the startHour/endHour viewport when positioning events', () => {
    const container = render({
      startHour: 6,
      endHour: 20,
      pxPerHour: 60,
      events: [{ id: 'noon', title: 'Noon', startHour: 12, endHour: 13 }],
    })
    const noon = container.querySelector('[data-event-id="noon"]') as HTMLElement
    // (12 - 6) * 60 = 360
    expect(noon.style.top).toBe('360px')
  })

  it('forwards the click of the card button, leaving Enter/Space to the native button', () => {
    const onClick = vi.fn()
    const container = render({
      events: [{ id: 'tap', title: 'Tap me', startHour: 10, endHour: 11, onClick }],
    })
    const action = container.querySelector(
      '[data-mol-id="day-timeline-event-action"]',
    ) as HTMLElement
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

  it('exposes clickable events as real buttons with an accessible name', () => {
    const container = render({
      events: [{ id: 'flight', title: 'Flight', startHour: 13, endHour: 16, onClick: () => {} }],
    })
    const button = container.querySelector('[role="list"] button') as HTMLButtonElement
    expect(button.getAttribute('aria-label')).toBe('Flight from 1 PM to 4 PM')
  })

  it('keeps non-clickable events inert: no button, no focusable control', () => {
    const container = render({
      events: [{ id: 'fixed', title: 'Fixed', startHour: 8, endHour: 9 }],
    })
    const card = container.querySelector('[data-event-id="fixed"]') as HTMLElement
    expect(card.querySelector('button')).toBeNull()
    expect(card.querySelector('[role="button"]')).toBeNull()
    expect(card.getAttribute('tabindex')).toBeNull()
    // The card still paints its content.
    expect(card.textContent).toContain('Fixed')
  })

  it('paints a per-event accent color as the inset accent bar, never a border-left', () => {
    const container = render({
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
    const red = container.querySelector('[data-event-id="red"]') as HTMLElement
    expect(red.className).toContain('accent-card')
    expect(red.className).toContain('surface-secondary')
    expect(red.style.getPropertyValue('--mol-accent')).toBe('#ff0000')
    expect(red.style.borderLeft).toBe('')
    // The caption takes the bar's color through the label recipe.
    expect(red.querySelector('.accent-card-label')?.textContent).toBe('Room 4')
    // Without an accent color the bar is the brand primary: the recipe's
    // primary tone, and no data color is set.
    const plain = container.querySelector('[data-event-id="plain"]') as HTMLElement
    expect(plain.style.getPropertyValue('--mol-accent')).toBe('')
    expect(plain.className).toContain('accent-card')
    expect(plain.className).toContain('surface-secondary')
  })

  it('translates the event aria-label with title and times', () => {
    const container = render({
      events: [{ id: 'a', title: 'Flight', startHour: 13, endHour: 16 }],
    })
    const ev = container.querySelector('[data-event-id="a"]') as HTMLElement
    expect(ev.getAttribute('aria-label')).toBe('Flight from 1 PM to 4 PM')
  })

  it('forwards dataMolId for agent automation', () => {
    const container = render({ dataMolId: 'trip-day-1', events: [] })
    expect(container.querySelector('[data-mol-id="trip-day-1"]')).not.toBeNull()
  })

  it('exposes role="list" and "listitem" for accessibility', () => {
    const container = render({
      events: [{ id: 'a', title: 'A', startHour: 9, endHour: 10 }],
    })
    expect(container.querySelector('[role="list"]')).not.toBeNull()
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(1)
  })
})
