/**
 * Calendar provider interface and related types.
 *
 * Defines framework-agnostic contracts for calendar widgets with support for
 * month, week, day, and agenda views, drag-and-drop event editing, and
 * event metadata.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// View types
// ---------------------------------------------------------------------------

/** Available calendar view modes. */
export type CalendarView = 'month' | 'week' | 'day' | 'agenda'

// ---------------------------------------------------------------------------
// Calendar Event
// ---------------------------------------------------------------------------

/**
 * A single calendar event.
 */
export interface CalendarEvent {
  /** Unique identifier for the event. */
  id: string
  /** Display title for the event (pass through i18n before setting). */
  title: string
  /** Event start date/time. */
  start: Date
  /** Event end date/time. */
  end: Date
  /** Whether this is an all-day event. Defaults to `false`. */
  allDay?: boolean
  /** Display colour for the event (CSS colour string). */
  color?: string
  /** Arbitrary metadata attached to the event. */
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Event change payloads
// ---------------------------------------------------------------------------

/**
 * Payload emitted when an event is moved (dragged) to a new time slot.
 */
export interface EventDropPayload {
  /** The event that was moved. */
  event: CalendarEvent
  /** The new start date/time. */
  newStart: Date
  /** The new end date/time. */
  newEnd: Date
}

/**
 * Payload emitted when an event is resized.
 */
export interface EventResizePayload {
  /** The event that was resized. */
  event: CalendarEvent
  /** The new start date/time (may be unchanged). */
  newStart: Date
  /** The new end date/time. */
  newEnd: Date
}

// ---------------------------------------------------------------------------
// Calendar Options
// ---------------------------------------------------------------------------

/**
 * Configuration for creating a calendar instance.
 */
export interface CalendarOptions {
  /** Events to display on the calendar. */
  events: CalendarEvent[]
  /** Initial view mode. Defaults to `'month'`. */
  view?: CalendarView
  /** Initial date to display. Defaults to today. */
  date?: Date
  /** Called when an event is clicked. */
  onEventClick?: (event: CalendarEvent) => void
  /** Called when a date cell is clicked. */
  onDateClick?: (date: Date) => void
  /** Called when an event is moved to a new time via drag-and-drop. */
  onEventDrop?: (payload: EventDropPayload) => void
  /** Called when an event is resized. */
  onEventResize?: (payload: EventResizePayload) => void
  /** Whether events can be dragged and resized. Defaults to `false`. */
  editable?: boolean
  /** First day of the week (0 = Sunday, 1 = Monday, …). Defaults to `0`. */
  firstDay?: number
  /** Locale string for date formatting (e.g. `'en-US'`). */
  locale?: string
}

// ---------------------------------------------------------------------------
// Calendar Instance
// ---------------------------------------------------------------------------

/**
 * A live calendar instance exposing query and mutation methods.
 */
export interface CalendarInstance {
  // -- Navigation ----------------------------------------------------------

  /** Returns the date currently in view. */
  getDate(): Date

  /**
   * Navigates to the given date.
   *
   * @param date - Target date to navigate to.
   */
  setDate(date: Date): void

  /** Navigates to the previous period (month/week/day depending on view). */
  prev(): void

  /** Navigates to the next period (month/week/day depending on view). */
  next(): void

  /** Navigates to today. */
  today(): void

  // -- View ----------------------------------------------------------------

  /** Returns the active view mode. */
  getView(): CalendarView

  /**
   * Switches to the given view mode.
   *
   * @param view - The view to switch to.
   */
  setView(view: CalendarView): void

  // -- Events --------------------------------------------------------------

  /** Returns all events currently loaded. */
  getEvents(): CalendarEvent[]

  /**
   * Replaces the event list.
   *
   * @param events - The new event list.
   */
  setEvents(events: CalendarEvent[]): void

  /**
   * Adds a single event.
   *
   * @param event - The event to add.
   */
  addEvent(event: CalendarEvent): void

  /**
   * Updates an event by id with partial data.
   *
   * @param eventId - The id of the event to update.
   * @param updates - Partial event data to merge.
   */
  updateEvent(eventId: string, updates: Partial<Omit<CalendarEvent, 'id'>>): void

  /**
   * Removes an event by id.
   *
   * @param eventId - The id of the event to remove.
   */
  removeEvent(eventId: string): void

  // -- Lifecycle -----------------------------------------------------------

  /** Releases resources held by the calendar instance. */
  destroy(): void
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Contract that bond packages must implement to provide calendar
 * functionality.
 */
export interface CalendarProvider {
  /**
   * Creates a new calendar instance from the given options.
   *
   * @param options - Calendar configuration.
   * @returns A calendar instance.
   */
  createCalendar(options: CalendarOptions): CalendarInstance
}
