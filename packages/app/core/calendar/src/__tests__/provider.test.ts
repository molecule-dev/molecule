import { beforeEach, describe, expect, it, vi } from 'vitest'

import { unbond } from '@molecule/app-bond'

import { createCalendar, getProvider, hasProvider, setProvider } from '../provider.js'
import type {
  CalendarEvent,
  CalendarInstance,
  CalendarOptions,
  CalendarProvider,
  CalendarView,
} from '../types.js'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockEvent(overrides?: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: '1',
    title: 'Test Event',
    start: new Date('2026-03-28T10:00:00'),
    end: new Date('2026-03-28T11:00:00'),
    ...overrides,
  }
}

function createMockCalendarInstance(options: CalendarOptions): CalendarInstance {
  const state = {
    events: [...options.events],
    date: options.date ?? new Date(),
    view: options.view ?? ('month' as CalendarView),
  }

  return {
    getDate: () => state.date,
    setDate: (date: Date) => {
      state.date = date
    },
    prev: () => {
      /* no-op in mock */
    },
    next: () => {
      /* no-op in mock */
    },
    today: () => {
      state.date = new Date()
    },
    getView: () => state.view,
    setView: (view: CalendarView) => {
      state.view = view
    },
    getEvents: () => state.events,
    setEvents: (events: CalendarEvent[]) => {
      state.events = [...events]
    },
    addEvent: (event: CalendarEvent) => {
      state.events.push(event)
    },
    updateEvent: (eventId: string, updates: Partial<Omit<CalendarEvent, 'id'>>) => {
      const idx = state.events.findIndex((e) => e.id === eventId)
      if (idx !== -1) {
        state.events[idx] = { ...state.events[idx], ...updates }
      }
    },
    removeEvent: (eventId: string) => {
      state.events = state.events.filter((e) => e.id !== eventId)
    },
    destroy: vi.fn(),
  }
}

function createMockProvider(): CalendarProvider {
  return {
    createCalendar: (opts: CalendarOptions) => createMockCalendarInstance(opts),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Calendar provider', () => {
  beforeEach(() => {
    unbond('calendar')
  })

  describe('setProvider / getProvider / hasProvider', () => {
    it('hasProvider returns false when no provider is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('setProvider bonds the provider and hasProvider returns true', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })

    it('getProvider returns the bonded provider', () => {
      const mock = createMockProvider()
      setProvider(mock)
      expect(getProvider()).toBe(mock)
    })

    it('getProvider throws when no provider is bonded', () => {
      expect(() => getProvider()).toThrow('@molecule/app-calendar')
    })
  })

  describe('createCalendar', () => {
    it('delegates to the bonded provider', () => {
      const mock = createMockProvider()
      const spy = vi.spyOn(mock, 'createCalendar')
      setProvider(mock)

      const options: CalendarOptions = {
        events: [createMockEvent()],
        view: 'week',
      }

      const instance = createCalendar(options)
      expect(spy).toHaveBeenCalledWith(options)
      expect(instance.getEvents()).toHaveLength(1)
    })

    it('throws when no provider is bonded', () => {
      expect(() => createCalendar({ events: [] })).toThrow('@molecule/app-calendar')
    })
  })
})

describe('CalendarInstance (mock conformance)', () => {
  let instance: CalendarInstance

  beforeEach(() => {
    unbond('calendar')
    setProvider(createMockProvider())
    instance = createCalendar({
      events: [
        createMockEvent({ id: '1', title: 'Event A' }),
        createMockEvent({ id: '2', title: 'Event B' }),
      ],
      view: 'month',
      date: new Date('2026-03-01'),
    })
  })

  // -- Navigation ----------------------------------------------------------

  it('getDate returns the current date', () => {
    expect(instance.getDate()).toEqual(new Date('2026-03-01'))
  })

  it('setDate navigates to a specific date', () => {
    const target = new Date('2026-06-15')
    instance.setDate(target)
    expect(instance.getDate()).toEqual(target)
  })

  it('prev is callable', () => {
    expect(() => instance.prev()).not.toThrow()
  })

  it('next is callable', () => {
    expect(() => instance.next()).not.toThrow()
  })

  it('today sets the date to today', () => {
    instance.setDate(new Date('2020-01-01'))
    instance.today()
    const now = new Date()
    // Just check same day (avoid millisecond drift)
    expect(instance.getDate().toDateString()).toBe(now.toDateString())
  })

  // -- View ----------------------------------------------------------------

  it('getView returns the active view', () => {
    expect(instance.getView()).toBe('month')
  })

  it('setView switches the view', () => {
    instance.setView('week')
    expect(instance.getView()).toBe('week')

    instance.setView('day')
    expect(instance.getView()).toBe('day')

    instance.setView('agenda')
    expect(instance.getView()).toBe('agenda')
  })

  // -- Events --------------------------------------------------------------

  it('getEvents returns the loaded events', () => {
    const events = instance.getEvents()
    expect(events).toHaveLength(2)
    expect(events[0].title).toBe('Event A')
    expect(events[1].title).toBe('Event B')
  })

  it('setEvents replaces all events', () => {
    instance.setEvents([createMockEvent({ id: '3', title: 'Event C' })])
    expect(instance.getEvents()).toHaveLength(1)
    expect(instance.getEvents()[0].title).toBe('Event C')
  })

  it('addEvent adds a new event', () => {
    instance.addEvent(createMockEvent({ id: '3', title: 'Event C' }))
    expect(instance.getEvents()).toHaveLength(3)
    expect(instance.getEvents()[2].title).toBe('Event C')
  })

  it('updateEvent updates an existing event by id', () => {
    instance.updateEvent('1', { title: 'Updated A' })
    expect(instance.getEvents().find((e) => e.id === '1')?.title).toBe('Updated A')
  })

  it('updateEvent is a no-op for non-existent id', () => {
    instance.updateEvent('nonexistent', { title: 'Ghost' })
    expect(instance.getEvents()).toHaveLength(2)
  })

  it('removeEvent removes an event by id', () => {
    instance.removeEvent('1')
    expect(instance.getEvents()).toHaveLength(1)
    expect(instance.getEvents()[0].id).toBe('2')
  })

  it('removeEvent is a no-op for non-existent id', () => {
    instance.removeEvent('nonexistent')
    expect(instance.getEvents()).toHaveLength(2)
  })

  // -- Lifecycle -----------------------------------------------------------

  it('destroy is callable', () => {
    expect(() => instance.destroy()).not.toThrow()
  })
})
