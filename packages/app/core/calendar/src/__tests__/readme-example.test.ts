/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the FullCalendar-style bond.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { provider } from '@molecule/app-calendar-fullcalendar'

import type { CalendarEvent } from '../index.js'
import { createCalendar, setProvider } from '../index.js'

describe('README @example', () => {
  it('bonds the provider, holds events in memory, and navigates by month', () => {
    setProvider(provider)

    const events: CalendarEvent[] = [
      {
        id: 'evt_1',
        title: 'Team standup',
        start: new Date('2026-03-02T09:00:00'),
        end: new Date('2026-03-02T09:15:00'),
      },
    ]
    const calendar = createCalendar({
      events,
      view: 'month',
      date: new Date('2026-03-01T12:00:00'),
    })

    calendar.addEvent({
      id: 'evt_2',
      title: 'Design review',
      start: new Date('2026-03-04T14:00:00'),
      end: new Date('2026-03-04T15:00:00'),
    })
    const titles = calendar.getEvents().map((e) => e.title)
    expect(titles).toEqual(['Team standup', 'Design review'])

    calendar.next()
    expect(calendar.getDate().getMonth()).toBe(3)
    expect(calendar.getView()).toBe('month')

    calendar.destroy()
  })
})
