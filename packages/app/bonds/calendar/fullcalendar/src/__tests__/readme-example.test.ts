/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { createCalendar, setProvider } from '@molecule/app-calendar'

import { createFullCalendarProvider } from '../index.js'

describe('README @example', () => {
  it('bonds the provider and manages calendar state through the core', () => {
    setProvider(createFullCalendarProvider({ defaultView: 'week', allowEventOverlap: false }))

    const onEventClick = vi.fn()
    const calendar = createCalendar({
      date: new Date(2026, 8, 21),
      editable: true,
      firstDay: 1,
      events: [
        {
          id: 'standup',
          title: 'Standup',
          start: new Date(2026, 8, 21, 9),
          end: new Date(2026, 8, 21, 9, 15),
        },
      ],
      onEventClick,
    })

    calendar.addEvent({
      id: 'review',
      title: 'Design review',
      start: new Date(2026, 8, 22, 14),
      end: new Date(2026, 8, 22, 15),
    })
    expect(calendar.getView()).toBe('week')
    calendar.next()
    expect(calendar.getDate()).toEqual(new Date(2026, 8, 28))

    const visible = calendar.getEvents()
    expect(visible.map((e) => e.id)).toEqual(['standup', 'review'])

    calendar.destroy()
    expect(calendar.getEvents()).toEqual([])
  })
})
