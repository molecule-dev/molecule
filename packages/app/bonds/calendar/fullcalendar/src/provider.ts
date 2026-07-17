/**
 * FullCalendar-style implementation of the molecule CalendarProvider.
 *
 * Provides a headless calendar state manager following FullCalendar's
 * patterns. Framework bindings (React, Vue, etc.) use the extended
 * {@link FullCalendarInstance} internal methods to sync DOM interactions
 * with provider state.
 *
 * @module
 */

import type {
  CalendarEvent,
  CalendarInstance,
  CalendarOptions,
  CalendarProvider,
  CalendarView,
} from '@molecule/app-calendar'

import type { FullCalendarConfig, FullCalendarInstance } from './types.js'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Clones a CalendarEvent to prevent external mutation.
 *
 * @param event - The event to clone.
 * @returns A shallow clone of the event with dates copied.
 */
function cloneEvent(event: CalendarEvent): CalendarEvent {
  return {
    ...event,
    start: new Date(event.start.getTime()),
    end: new Date(event.end.getTime()),
    metadata: event.metadata ? { ...event.metadata } : undefined,
  }
}

/**
 * Determines whether two half-open date ranges overlap.
 *
 * Uses half-open interval semantics (`[start, end)`), so events that merely
 * touch at an edge (one ends exactly when the next begins) do NOT count as
 * overlapping — matching FullCalendar's `eventOverlap` behaviour.
 *
 * @param aStart - Start of the first range.
 * @param aEnd - End of the first range.
 * @param bStart - Start of the second range.
 * @param bEnd - End of the second range.
 * @returns `true` if the ranges overlap.
 */
function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime()
}

// ---------------------------------------------------------------------------
// Calendar instance
// ---------------------------------------------------------------------------

/**
 * Creates a FullCalendarInstance that manages calendar state in memory.
 *
 * @param options - Calendar configuration from the core interface.
 * @param config - Optional FullCalendar-specific configuration.
 * @returns A FullCalendarInstance backed by in-memory state.
 */
function createCalendarInstance(
  options: CalendarOptions,
  config: FullCalendarConfig = {},
): FullCalendarInstance {
  let events = options.events.map(cloneEvent)
  let currentView: CalendarView = options.view ?? config.defaultView ?? 'month'
  let currentDate: Date = options.date ? new Date(options.date.getTime()) : new Date()
  const editable = options.editable ?? false
  const firstDay = options.firstDay ?? config.defaultFirstDay ?? 0
  const locale = options.locale

  // FullCalendar-style interaction rules, honoured on drag/resize.
  // `allowEventOverlap` mirrors FullCalendar's `eventOverlap` option: when
  // false, a drag/resize that would collide with another event is rejected.
  // `minEventDurationMinutes` clamps a resize so an event is never shorter
  // than the configured floor. Both fall back to FullCalendar's defaults.
  const allowEventOverlap = config.allowEventOverlap ?? true
  const minEventDurationMs = Math.max(0, config.minEventDurationMinutes ?? 30) * 60_000

  // -------------------------------------------------------------------------
  // Navigation helpers
  // -------------------------------------------------------------------------

  /**
   * Navigates the current date by the period corresponding to the active view.
   *
   * @param direction - `1` for next, `-1` for previous.
   */
  function navigate(direction: 1 | -1): void {
    const d = new Date(currentDate.getTime())
    switch (currentView) {
      case 'month':
        d.setMonth(d.getMonth() + direction)
        break
      case 'week':
        d.setDate(d.getDate() + 7 * direction)
        break
      case 'day':
      case 'agenda':
        d.setDate(d.getDate() + direction)
        break
    }
    currentDate = d
  }

  /**
   * Returns whether a candidate time range collides with any event other than
   * the one being moved/resized.
   *
   * @param eventId - The id of the event being moved/resized (excluded from the check).
   * @param start - Candidate start date/time.
   * @param end - Candidate end date/time.
   * @returns `true` if the range overlaps another event.
   */
  function overlapsOtherEvent(eventId: string, start: Date, end: Date): boolean {
    return events.some((e) => e.id !== eventId && rangesOverlap(start, end, e.start, e.end))
  }

  // -------------------------------------------------------------------------
  // Instance
  // -------------------------------------------------------------------------

  const instance: FullCalendarInstance = {
    // -- Navigation --------------------------------------------------------

    getDate(): Date {
      return new Date(currentDate.getTime())
    },

    setDate(date: Date): void {
      currentDate = new Date(date.getTime())
    },

    prev(): void {
      navigate(-1)
    },

    next(): void {
      navigate(1)
    },

    today(): void {
      currentDate = new Date()
    },

    // -- View --------------------------------------------------------------

    getView(): CalendarView {
      return currentView
    },

    setView(view: CalendarView): void {
      currentView = view
    },

    // -- Events ------------------------------------------------------------

    getEvents(): CalendarEvent[] {
      return events.map(cloneEvent)
    },

    setEvents(newEvents: CalendarEvent[]): void {
      events = newEvents.map(cloneEvent)
    },

    addEvent(event: CalendarEvent): void {
      events.push(cloneEvent(event))
    },

    updateEvent(eventId: string, updates: Partial<Omit<CalendarEvent, 'id'>>): void {
      const idx = events.findIndex((e) => e.id === eventId)
      if (idx === -1) return

      const existing = events[idx]
      events[idx] = {
        ...existing,
        ...updates,
        id: existing.id,
        start: updates.start ? new Date(updates.start.getTime()) : existing.start,
        end: updates.end ? new Date(updates.end.getTime()) : existing.end,
        metadata: updates.metadata ? { ...updates.metadata } : existing.metadata,
      }
    },

    removeEvent(eventId: string): void {
      events = events.filter((e) => e.id !== eventId)
    },

    // -- Lifecycle ---------------------------------------------------------

    destroy(): void {
      events = []
    },

    // -- Internal methods for framework bindings ---------------------------

    _handleEventClick(eventId: string): void {
      if (!options.onEventClick) return
      const event = events.find((e) => e.id === eventId)
      if (event) {
        options.onEventClick(cloneEvent(event))
      }
    },

    _handleDateClick(date: Date): void {
      if (options.onDateClick) {
        options.onDateClick(new Date(date.getTime()))
      }
    },

    _handleEventDrop(eventId: string, newStart: Date, newEnd: Date): void {
      const event = events.find((e) => e.id === eventId)
      if (!event) return

      // Honour allowEventOverlap: reject a move that would collide with
      // another event, leaving the event at its original time.
      if (!allowEventOverlap && overlapsOtherEvent(eventId, newStart, newEnd)) {
        return
      }

      // Update internal state
      event.start = new Date(newStart.getTime())
      event.end = new Date(newEnd.getTime())

      if (options.onEventDrop) {
        options.onEventDrop({
          event: cloneEvent(event),
          newStart: new Date(newStart.getTime()),
          newEnd: new Date(newEnd.getTime()),
        })
      }
    },

    _handleEventResize(eventId: string, newStart: Date, newEnd: Date): void {
      const event = events.find((e) => e.id === eventId)
      if (!event) return

      // Honour minEventDurationMinutes: never let a resize shrink an event
      // below the configured minimum. The start is preserved and the end is
      // pushed out so the event is at least `minEventDurationMinutes` long.
      let effectiveEnd = newEnd
      if (effectiveEnd.getTime() - newStart.getTime() < minEventDurationMs) {
        effectiveEnd = new Date(newStart.getTime() + minEventDurationMs)
      }

      // Honour allowEventOverlap: reject a resize that would collide with
      // another event, leaving the event at its original size.
      if (!allowEventOverlap && overlapsOtherEvent(eventId, newStart, effectiveEnd)) {
        return
      }

      // Update internal state
      event.start = new Date(newStart.getTime())
      event.end = new Date(effectiveEnd.getTime())

      if (options.onEventResize) {
        options.onEventResize({
          event: cloneEvent(event),
          newStart: new Date(newStart.getTime()),
          newEnd: new Date(effectiveEnd.getTime()),
        })
      }
    },

    _getConfig(): FullCalendarConfig {
      return { ...config }
    },

    _isEditable(): boolean {
      return editable
    },

    _getFirstDay(): number {
      return firstDay
    },

    _getLocale(): string | undefined {
      return locale
    },
  }

  return instance
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Creates a FullCalendar-style calendar provider.
 *
 * @param config - Optional FullCalendar-specific configuration.
 * @returns A `CalendarProvider` backed by FullCalendar-style state management.
 *
 * @example
 * ```typescript
 * import { createFullCalendarProvider } from '@molecule/app-calendar-fullcalendar'
 * import { setProvider } from '@molecule/app-calendar'
 *
 * setProvider(createFullCalendarProvider())
 * ```
 */
export function createFullCalendarProvider(config: FullCalendarConfig = {}): CalendarProvider {
  return {
    createCalendar(options: CalendarOptions): CalendarInstance {
      return createCalendarInstance(options, config)
    },
  }
}

/** Default FullCalendar provider instance. */
export const provider: CalendarProvider = createFullCalendarProvider()
