import { describe, expect, it, vi } from 'vitest'

import type { CalendarEvent, CalendarOptions } from '@molecule/app-calendar'

import type { FullCalendarInstance } from '../types.js'
import { createFullCalendarProvider, provider } from '../provider.js'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: '1',
    title: 'Meeting',
    start: new Date('2026-03-28T10:00:00'),
    end: new Date('2026-03-28T11:00:00'),
    ...overrides,
  }
}

function createOptions(overrides: Partial<CalendarOptions> = {}): CalendarOptions {
  return {
    events: [
      makeEvent({ id: '1', title: 'Meeting' }),
      makeEvent({
        id: '2',
        title: 'Lunch',
        start: new Date('2026-03-28T12:00:00'),
        end: new Date('2026-03-28T13:00:00'),
      }),
      makeEvent({
        id: '3',
        title: 'Review',
        start: new Date('2026-03-29T09:00:00'),
        end: new Date('2026-03-29T10:00:00'),
      }),
    ],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('@molecule/app-calendar-fullcalendar', () => {
  describe('provider conformance', () => {
    it('exports a typed provider with createCalendar method', () => {
      expect(provider).toBeDefined()
      expect(typeof provider.createCalendar).toBe('function')
    })

    it('createFullCalendarProvider returns a CalendarProvider', () => {
      const p = createFullCalendarProvider()
      expect(typeof p.createCalendar).toBe('function')
    })

    it('createFullCalendarProvider accepts config', () => {
      const p = createFullCalendarProvider({ defaultView: 'week', defaultFirstDay: 1 })
      expect(typeof p.createCalendar).toBe('function')
    })
  })

  describe('basic calendar creation', () => {
    it('creates a calendar with default view', () => {
      const cal = provider.createCalendar(createOptions())
      expect(cal.getView()).toBe('month')
    })

    it('uses view from options', () => {
      const cal = provider.createCalendar(createOptions({ view: 'week' }))
      expect(cal.getView()).toBe('week')
    })

    it('uses default view from config when no options view', () => {
      const p = createFullCalendarProvider({ defaultView: 'day' })
      const cal = p.createCalendar(createOptions())
      expect(cal.getView()).toBe('day')
    })

    it('options view takes precedence over config default', () => {
      const p = createFullCalendarProvider({ defaultView: 'day' })
      const cal = p.createCalendar(createOptions({ view: 'agenda' }))
      expect(cal.getView()).toBe('agenda')
    })

    it('returns events', () => {
      const cal = provider.createCalendar(createOptions())
      expect(cal.getEvents()).toHaveLength(3)
    })

    it('uses provided initial date', () => {
      const date = new Date('2026-06-15')
      const cal = provider.createCalendar(createOptions({ date }))
      expect(cal.getDate().getFullYear()).toBe(2026)
      expect(cal.getDate().getMonth()).toBe(5) // June = 5
      expect(cal.getDate().getDate()).toBe(15)
    })
  })

  describe('navigation', () => {
    it('navigates to next month', () => {
      const cal = provider.createCalendar(
        createOptions({
          date: new Date('2026-03-15'),
          view: 'month',
        }),
      )
      cal.next()
      expect(cal.getDate().getMonth()).toBe(3) // April
    })

    it('navigates to previous month', () => {
      const cal = provider.createCalendar(
        createOptions({
          date: new Date('2026-03-15'),
          view: 'month',
        }),
      )
      cal.prev()
      expect(cal.getDate().getMonth()).toBe(1) // February
    })

    it('navigates next/prev by week in week view', () => {
      const cal = provider.createCalendar(
        createOptions({
          date: new Date('2026-03-15'),
          view: 'week',
        }),
      )
      cal.next()
      expect(cal.getDate().getDate()).toBe(22)
      cal.prev()
      expect(cal.getDate().getDate()).toBe(15)
    })

    it('navigates next/prev by day in day view', () => {
      const cal = provider.createCalendar(
        createOptions({
          date: new Date('2026-03-15'),
          view: 'day',
        }),
      )
      cal.next()
      expect(cal.getDate().getDate()).toBe(16)
      cal.prev()
      expect(cal.getDate().getDate()).toBe(15)
    })

    it('navigates next/prev by day in agenda view', () => {
      const cal = provider.createCalendar(
        createOptions({
          date: new Date('2026-03-15'),
          view: 'agenda',
        }),
      )
      cal.next()
      expect(cal.getDate().getDate()).toBe(16)
    })

    it('navigates to today', () => {
      const cal = provider.createCalendar(
        createOptions({
          date: new Date('2020-01-01'),
        }),
      )
      cal.today()
      const now = new Date()
      expect(cal.getDate().getFullYear()).toBe(now.getFullYear())
      expect(cal.getDate().getMonth()).toBe(now.getMonth())
      expect(cal.getDate().getDate()).toBe(now.getDate())
    })

    it('setDate navigates to a specific date', () => {
      const cal = provider.createCalendar(createOptions())
      const target = new Date('2027-12-25')
      cal.setDate(target)
      expect(cal.getDate().getFullYear()).toBe(2027)
      expect(cal.getDate().getMonth()).toBe(11)
      expect(cal.getDate().getDate()).toBe(25)
    })
  })

  describe('view switching', () => {
    it('switches view', () => {
      const cal = provider.createCalendar(createOptions())
      expect(cal.getView()).toBe('month')
      cal.setView('week')
      expect(cal.getView()).toBe('week')
      cal.setView('day')
      expect(cal.getView()).toBe('day')
      cal.setView('agenda')
      expect(cal.getView()).toBe('agenda')
    })
  })

  describe('event CRUD', () => {
    it('setEvents replaces all events', () => {
      const cal = provider.createCalendar(createOptions())
      expect(cal.getEvents()).toHaveLength(3)
      cal.setEvents([makeEvent({ id: 'new-1', title: 'New' })])
      expect(cal.getEvents()).toHaveLength(1)
      expect(cal.getEvents()[0].id).toBe('new-1')
    })

    it('addEvent appends an event', () => {
      const cal = provider.createCalendar(createOptions())
      cal.addEvent(makeEvent({ id: '4', title: 'New Event' }))
      expect(cal.getEvents()).toHaveLength(4)
      expect(cal.getEvents()[3].title).toBe('New Event')
    })

    it('updateEvent updates an existing event', () => {
      const cal = provider.createCalendar(createOptions())
      cal.updateEvent('1', { title: 'Updated Meeting' })
      const event = cal.getEvents().find((e) => e.id === '1')
      expect(event?.title).toBe('Updated Meeting')
    })

    it('updateEvent updates dates', () => {
      const cal = provider.createCalendar(createOptions())
      const newStart = new Date('2026-04-01T14:00:00')
      const newEnd = new Date('2026-04-01T15:00:00')
      cal.updateEvent('1', { start: newStart, end: newEnd })
      const event = cal.getEvents().find((e) => e.id === '1')
      expect(event?.start.getTime()).toBe(newStart.getTime())
      expect(event?.end.getTime()).toBe(newEnd.getTime())
    })

    it('updateEvent does nothing for non-existent id', () => {
      const cal = provider.createCalendar(createOptions())
      cal.updateEvent('non-existent', { title: 'Nope' })
      expect(cal.getEvents()).toHaveLength(3)
    })

    it('removeEvent removes an event', () => {
      const cal = provider.createCalendar(createOptions())
      cal.removeEvent('2')
      expect(cal.getEvents()).toHaveLength(2)
      expect(cal.getEvents().find((e) => e.id === '2')).toBeUndefined()
    })

    it('removeEvent does nothing for non-existent id', () => {
      const cal = provider.createCalendar(createOptions())
      cal.removeEvent('non-existent')
      expect(cal.getEvents()).toHaveLength(3)
    })
  })

  describe('event immutability', () => {
    it('getEvents returns copies, not internal references', () => {
      const cal = provider.createCalendar(createOptions())
      const events = cal.getEvents()
      events[0].title = 'Mutated'
      expect(cal.getEvents()[0].title).toBe('Meeting')
    })

    it('addEvent clones input', () => {
      const event = makeEvent({ id: '99', title: 'Original' })
      const cal = provider.createCalendar(createOptions())
      cal.addEvent(event)
      event.title = 'Mutated'
      expect(cal.getEvents().find((e) => e.id === '99')?.title).toBe('Original')
    })

    it('setEvents clones input array', () => {
      const events = [makeEvent({ id: '99', title: 'Original' })]
      const cal = provider.createCalendar(createOptions())
      cal.setEvents(events)
      events[0].title = 'Mutated'
      expect(cal.getEvents()[0].title).toBe('Original')
    })
  })

  describe('destroy', () => {
    it('clears all events', () => {
      const cal = provider.createCalendar(createOptions())
      expect(cal.getEvents()).toHaveLength(3)
      cal.destroy()
      expect(cal.getEvents()).toHaveLength(0)
    })
  })

  describe('internal methods (FullCalendarInstance)', () => {
    it('_handleEventClick fires onEventClick callback', () => {
      const onEventClick = vi.fn()
      const cal = provider.createCalendar(createOptions({ onEventClick })) as FullCalendarInstance
      cal._handleEventClick('1')
      expect(onEventClick).toHaveBeenCalledOnce()
      expect(onEventClick.mock.calls[0][0].id).toBe('1')
    })

    it('_handleEventClick does nothing when no callback', () => {
      const cal = provider.createCalendar(createOptions()) as FullCalendarInstance
      expect(() => cal._handleEventClick('1')).not.toThrow()
    })

    it('_handleEventClick does nothing for non-existent event', () => {
      const onEventClick = vi.fn()
      const cal = provider.createCalendar(createOptions({ onEventClick })) as FullCalendarInstance
      cal._handleEventClick('non-existent')
      expect(onEventClick).not.toHaveBeenCalled()
    })

    it('_handleDateClick fires onDateClick callback', () => {
      const onDateClick = vi.fn()
      const cal = provider.createCalendar(createOptions({ onDateClick })) as FullCalendarInstance
      const clickDate = new Date('2026-03-28')
      cal._handleDateClick(clickDate)
      expect(onDateClick).toHaveBeenCalledOnce()
      expect(onDateClick.mock.calls[0][0].getTime()).toBe(clickDate.getTime())
    })

    it('_handleDateClick does nothing when no callback', () => {
      const cal = provider.createCalendar(createOptions()) as FullCalendarInstance
      expect(() => cal._handleDateClick(new Date())).not.toThrow()
    })

    it('_handleEventDrop fires onEventDrop and updates internal state', () => {
      const onEventDrop = vi.fn()
      const cal = provider.createCalendar(createOptions({ onEventDrop })) as FullCalendarInstance
      const newStart = new Date('2026-04-01T10:00:00')
      const newEnd = new Date('2026-04-01T11:00:00')
      cal._handleEventDrop('1', newStart, newEnd)
      expect(onEventDrop).toHaveBeenCalledOnce()

      const payload = onEventDrop.mock.calls[0][0]
      expect(payload.event.id).toBe('1')
      expect(payload.newStart.getTime()).toBe(newStart.getTime())
      expect(payload.newEnd.getTime()).toBe(newEnd.getTime())

      // Internal state updated
      const event = cal.getEvents().find((e) => e.id === '1')
      expect(event?.start.getTime()).toBe(newStart.getTime())
      expect(event?.end.getTime()).toBe(newEnd.getTime())
    })

    it('_handleEventDrop does nothing for non-existent event', () => {
      const onEventDrop = vi.fn()
      const cal = provider.createCalendar(createOptions({ onEventDrop })) as FullCalendarInstance
      cal._handleEventDrop('non-existent', new Date(), new Date())
      expect(onEventDrop).not.toHaveBeenCalled()
    })

    it('_handleEventResize fires onEventResize and updates internal state', () => {
      const onEventResize = vi.fn()
      const cal = provider.createCalendar(createOptions({ onEventResize })) as FullCalendarInstance
      const newStart = new Date('2026-03-28T10:00:00')
      const newEnd = new Date('2026-03-28T12:00:00')
      cal._handleEventResize('1', newStart, newEnd)
      expect(onEventResize).toHaveBeenCalledOnce()

      const payload = onEventResize.mock.calls[0][0]
      expect(payload.event.id).toBe('1')
      expect(payload.newEnd.getTime()).toBe(newEnd.getTime())
    })

    it('_handleEventResize does nothing for non-existent event', () => {
      const onEventResize = vi.fn()
      const cal = provider.createCalendar(createOptions({ onEventResize })) as FullCalendarInstance
      cal._handleEventResize('non-existent', new Date(), new Date())
      expect(onEventResize).not.toHaveBeenCalled()
    })

    it('_getConfig returns config copy', () => {
      const p = createFullCalendarProvider({ defaultView: 'week', allowEventOverlap: false })
      const cal = p.createCalendar(createOptions()) as FullCalendarInstance
      const cfg = cal._getConfig()
      expect(cfg.defaultView).toBe('week')
      expect(cfg.allowEventOverlap).toBe(false)
    })

    it('_isEditable returns false by default', () => {
      const cal = provider.createCalendar(createOptions()) as FullCalendarInstance
      expect(cal._isEditable()).toBe(false)
    })

    it('_isEditable returns true when options.editable is true', () => {
      const cal = provider.createCalendar(createOptions({ editable: true })) as FullCalendarInstance
      expect(cal._isEditable()).toBe(true)
    })

    it('_getFirstDay returns 0 by default', () => {
      const cal = provider.createCalendar(createOptions()) as FullCalendarInstance
      expect(cal._getFirstDay()).toBe(0)
    })

    it('_getFirstDay uses options firstDay', () => {
      const cal = provider.createCalendar(createOptions({ firstDay: 1 })) as FullCalendarInstance
      expect(cal._getFirstDay()).toBe(1)
    })

    it('_getFirstDay falls back to config defaultFirstDay', () => {
      const p = createFullCalendarProvider({ defaultFirstDay: 1 })
      const cal = p.createCalendar(createOptions()) as FullCalendarInstance
      expect(cal._getFirstDay()).toBe(1)
    })

    it('_getLocale returns undefined by default', () => {
      const cal = provider.createCalendar(createOptions()) as FullCalendarInstance
      expect(cal._getLocale()).toBeUndefined()
    })

    it('_getLocale returns locale from options', () => {
      const cal = provider.createCalendar(
        createOptions({ locale: 'de-DE' }),
      ) as FullCalendarInstance
      expect(cal._getLocale()).toBe('de-DE')
    })
  })
})
