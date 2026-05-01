/**
 * Unit tests for `<DayTimeline>` — vertical day-of-events timeline.
 *
 * @module
 */

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    textSize: () => 'text',
    fontWeight: () => 'fw',
  }),
}))

vi.mock('@molecule/app-react', () => ({
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

import { DayTimeline, formatHour } from '../DayTimeline.js'

afterEach(() => {
  cleanup()
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
    const { container } = render(<DayTimeline events={[]} />)
    expect(container.querySelectorAll('[data-event-id]')).toHaveLength(0)
  })

  it('renders one card per event with stable data-event-id', () => {
    const { container } = render(
      <DayTimeline
        events={[
          { id: 'a', title: 'Stand-up', startHour: 9, endHour: 9.5 },
          { id: 'b', title: 'Lunch', startHour: 12, endHour: 13 },
        ]}
      />,
    )
    expect(container.querySelectorAll('[data-event-id]')).toHaveLength(2)
    expect(container.querySelector('[data-event-id="a"]')).not.toBeNull()
    expect(container.querySelector('[data-event-id="b"]')).not.toBeNull()
  })

  it('positions events vertically by startHour', () => {
    const { container } = render(
      <DayTimeline
        startHour={0}
        endHour={24}
        pxPerHour={60}
        events={[
          { id: 'morning', title: 'Morning', startHour: 9, endHour: 10 },
          { id: 'evening', title: 'Evening', startHour: 18, endHour: 19 },
        ]}
      />,
    )
    const morning = container.querySelector('[data-event-id="morning"]') as HTMLElement
    const evening = container.querySelector('[data-event-id="evening"]') as HTMLElement
    expect(morning.style.top).toBe('540px') // 9 * 60
    expect(evening.style.top).toBe('1080px') // 18 * 60
  })

  it('sizes events by duration × pxPerHour', () => {
    const { container } = render(
      <DayTimeline
        pxPerHour={50}
        events={[{ id: 'block', title: 'Block', startHour: 10, endHour: 12 }]}
      />,
    )
    const block = container.querySelector('[data-event-id="block"]') as HTMLElement
    expect(block.style.height).toBe('100px') // 2h * 50
  })

  it('renders an axis tick per hour in the visible window', () => {
    const { container } = render(<DayTimeline startHour={9} endHour={12} events={[]} />)
    expect(container.querySelectorAll('[data-axis-tick]')).toHaveLength(3)
  })

  it('hides axis labels when showAxisLabels=false', () => {
    const { container } = render(
      <DayTimeline showAxisLabels={false} startHour={9} endHour={12} events={[]} />,
    )
    expect(container.querySelectorAll('[data-axis-tick]')).toHaveLength(0)
  })

  it('honors the startHour/endHour viewport when positioning events', () => {
    const { container } = render(
      <DayTimeline
        startHour={6}
        endHour={20}
        pxPerHour={60}
        events={[{ id: 'noon', title: 'Noon', startHour: 12, endHour: 13 }]}
      />,
    )
    const noon = container.querySelector('[data-event-id="noon"]') as HTMLElement
    // (12 - 6) * 60 = 360
    expect(noon.style.top).toBe('360px')
  })

  it('forwards click handlers and Enter key presses', () => {
    const onClick = vi.fn()
    const { container } = render(
      <DayTimeline
        events={[{ id: 'tap', title: 'Tap me', startHour: 10, endHour: 11, onClick }]}
      />,
    )
    const tap = container.querySelector('[data-event-id="tap"]') as HTMLElement
    fireEvent.click(tap)
    fireEvent.keyDown(tap, { key: 'Enter' })
    fireEvent.keyDown(tap, { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  it('paints a per-event accent color via the left border', () => {
    const { container } = render(
      <DayTimeline
        events={[{ id: 'red', title: 'Red', startHour: 9, endHour: 10, accentColor: '#ff0000' }]}
      />,
    )
    const red = container.querySelector('[data-event-id="red"]') as HTMLElement
    expect(red.style.borderLeft).toContain('rgb(255, 0, 0)')
  })

  it('translates the event aria-label with title and times', () => {
    const { container } = render(
      <DayTimeline events={[{ id: 'a', title: 'Flight', startHour: 13, endHour: 16 }]} />,
    )
    const ev = container.querySelector('[data-event-id="a"]') as HTMLElement
    expect(ev.getAttribute('aria-label')).toBe('Flight from 1 PM to 4 PM')
  })

  it('forwards dataMolId for agent automation', () => {
    const { container } = render(<DayTimeline dataMolId="trip-day-1" events={[]} />)
    expect(container.querySelector('[data-mol-id="trip-day-1"]')).not.toBeNull()
  })

  it('exposes role="list" and "listitem" for accessibility', () => {
    render(<DayTimeline events={[{ id: 'a', title: 'A', startHour: 9, endHour: 10 }]} />)
    expect(screen.getByRole('list')).toBeDefined()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })
})
