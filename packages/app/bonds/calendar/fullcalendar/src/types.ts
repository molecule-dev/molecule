/**
 * FullCalendar provider configuration types.
 *
 * @module
 */

import type { CalendarInstance, CalendarView } from '@molecule/app-calendar'

/**
 * Configuration options for the FullCalendar calendar provider.
 */
export interface FullCalendarConfig {
  /**
   * Default view to use when no view is specified in options.
   * Defaults to `'month'`.
   */
  defaultView?: CalendarView

  /**
   * First day of the week (0 = Sunday, 1 = Monday, …).
   * Defaults to `0`.
   */
  defaultFirstDay?: number

  /**
   * Whether to allow events to overlap by default.
   * Defaults to `true`.
   */
  allowEventOverlap?: boolean

  /**
   * Minimum event duration in minutes for new/resized events.
   * Defaults to `30`.
   */
  minEventDurationMinutes?: number
}

/**
 * Extended calendar instance with FullCalendar-specific internal methods.
 *
 * Framework bindings use the `_` prefixed methods to sync DOM events
 * from the actual FullCalendar library instance to the provider state.
 */
export interface FullCalendarInstance extends CalendarInstance {
  /**
   * Called by framework bindings when the user clicks an event in the DOM.
   *
   * @param eventId - The id of the clicked event.
   */
  _handleEventClick(eventId: string): void

  /**
   * Called by framework bindings when the user clicks a date cell in the DOM.
   *
   * @param date - The clicked date.
   */
  _handleDateClick(date: Date): void

  /**
   * Called by framework bindings when an event is dragged to a new time.
   *
   * @param eventId - The id of the moved event.
   * @param newStart - The new start date/time.
   * @param newEnd - The new end date/time.
   */
  _handleEventDrop(eventId: string, newStart: Date, newEnd: Date): void

  /**
   * Called by framework bindings when an event is resized.
   *
   * @param eventId - The id of the resized event.
   * @param newStart - The new start date/time.
   * @param newEnd - The new end date/time.
   */
  _handleEventResize(eventId: string, newStart: Date, newEnd: Date): void

  /**
   * Returns the provider configuration.
   *
   * @returns The FullCalendar configuration.
   */
  _getConfig(): FullCalendarConfig

  /**
   * Returns whether the calendar is editable.
   *
   * @returns `true` if editing is enabled.
   */
  _isEditable(): boolean

  /**
   * Returns the first day of the week.
   *
   * @returns The first day (0 = Sunday, 1 = Monday, …).
   */
  _getFirstDay(): number

  /**
   * Returns the locale string.
   *
   * @returns The locale string, or `undefined` if not set.
   */
  _getLocale(): string | undefined
}
