/**
 * `@molecule/app-calendar`
 * Utility functions for calendar module
 */

import type { CalendarEvent, EventInput } from './types.js'

/**
 * Check if two calendar events overlap in time.
 * @param event1 - The first event to compare.
 * @param event2 - The second event to compare.
 * @returns Whether the two events have overlapping time ranges.
 */
export function eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
  const start1 = new Date(event1.startDate).getTime()
  const end1 = new Date(event1.endDate).getTime()
  const start2 = new Date(event2.startDate).getTime()
  const end2 = new Date(event2.endDate).getTime()

  return start1 < end2 && end1 > start2
}

/**
 * Get the duration of a calendar event in minutes.
 * @param event - The calendar event to measure.
 * @returns The event duration in minutes, rounded to the nearest integer.
 */
export function getEventDuration(event: CalendarEvent): number {
  const start = new Date(event.startDate).getTime()
  const end = new Date(event.endDate).getTime()
  return Math.round((end - start) / (1000 * 60))
}

/**
 * Format an event's time range as a human-readable string.
 * Handles all-day events, same-day events, and multi-day events differently.
 * @param event - The calendar event to format.
 * @param locale - The locale code for date/time formatting (default: 'en-US').
 * @returns A formatted time range string (e.g., "9:00 AM - 10:00 AM" or "Mon, Jan 5").
 */
export function formatEventTimeRange(event: CalendarEvent, locale = 'en-US'): string {
  const start = new Date(event.startDate)
  const end = new Date(event.endDate)

  if (event.allDay) {
    const sameDay = start.toDateString() === end.toDateString()
    if (sameDay) {
      return start.toLocaleDateString(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    }
    return `${start.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    })} - ${end.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`
  }

  const sameDay = start.toDateString() === end.toDateString()
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  }

  if (sameDay) {
    return `${start.toLocaleTimeString(locale, timeOptions)} - ${end.toLocaleTimeString(
      locale,
      timeOptions,
    )}`
  }

  return `${start.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    ...timeOptions,
  })} - ${end.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    ...timeOptions,
  })}`
}

/**
 * Parse a text string into a quick calendar event. Uses basic keyword matching
 * for time references. Returns null if no title can be extracted.
 * @param text - Natural language event text (e.g., "Meeting tomorrow at 3pm").
 * @param calendarId - The calendar ID to assign the event to.
 * @returns An EventInput for a 1-hour event starting at the next hour, or null if parsing fails.
 */
export function parseQuickEvent(text: string, calendarId: string): EventInput | null {
  // Basic implementation - real apps might use NLP
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Extract title (everything before common time words)
  // Match time keywords with word boundaries, either at start/after whitespace, or at end
  const timeKeywordMatch = text.match(/(?:^|\s)(at|on|tomorrow|today)(?:\s|$)/i)
  const title = timeKeywordMatch ? text.slice(0, timeKeywordMatch.index).trim() : text.trim()

  if (!title) {
    return null
  }

  // Default to 1 hour event starting at next hour
  const startDate = new Date(now)
  startDate.setMinutes(0, 0, 0)
  startDate.setHours(startDate.getHours() + 1)

  const endDate = new Date(startDate)
  endDate.setHours(endDate.getHours() + 1)

  return {
    calendarId,
    title,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    allDay: false,
  }
}
