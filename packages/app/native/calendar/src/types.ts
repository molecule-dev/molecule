/**
 * `@molecule/app-calendar`
 * Type definitions for calendar module
 */

/**
 * Device calendar metadata (ID, title, color, read-only flag, account, visibility).
 */
export interface Calendar {
  /** Calendar ID */
  id: string
  /** Calendar title/name */
  title: string
  /** Calendar color */
  color?: string
  /** Whether calendar is read-only */
  readOnly: boolean
  /** Calendar type */
  type: 'local' | 'subscription' | 'birthday' | 'exchange' | 'google' | 'other'
  /** Account name */
  accountName?: string
  /** Whether calendar is visible */
  visible: boolean
}

/**
 * A calendar event attendee with email, name, RSVP status, and organizer/optional flags.
 */
export interface EventAttendee {
  /** Attendee email */
  email: string
  /** Attendee name */
  name?: string
  /** Attendance status */
  status?: 'pending' | 'accepted' | 'declined' | 'tentative'
  /** Whether attendee is organizer */
  isOrganizer?: boolean
  /** Whether attendee is optional */
  isOptional?: boolean
}

/**
 * Event reminder/alarm
 */
export interface EventReminder {
  /** Minutes before event to trigger reminder */
  minutes: number
  /** Reminder method */
  method?: 'alert' | 'email' | 'sms'
}

/**
 * Recurrence rule
 */
export interface RecurrenceRule {
  /** Recurrence frequency */
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  /** Interval between occurrences */
  interval?: number
  /** End date (ISO string) */
  endDate?: string
  /** Number of occurrences */
  count?: number
  /** Days of week (0-6, Sunday-Saturday) */
  daysOfWeek?: number[]
  /** Days of month (1-31) */
  daysOfMonth?: number[]
  /** Months (1-12) */
  months?: number[]
}

/**
 * Full calendar event with title, dates, location, attendees, reminders, and recurrence rules.
 */
export interface CalendarEvent {
  /** Event ID */
  id: string
  /** Calendar ID */
  calendarId: string
  /** Event title */
  title: string
  /** Event description */
  description?: string
  /** Event location */
  location?: string
  /** Start date/time (ISO string) */
  startDate: string
  /** End date/time (ISO string) */
  endDate: string
  /** Whether event is all-day */
  allDay: boolean
  /** Event timezone */
  timezone?: string
  /** Event URL */
  url?: string
  /** Event notes */
  notes?: string
  /** Attendees */
  attendees?: EventAttendee[]
  /** Reminders */
  reminders?: EventReminder[]
  /** Recurrence rule */
  recurrence?: RecurrenceRule
  /** Event status */
  status?: 'confirmed' | 'tentative' | 'cancelled'
  /** Event availability */
  availability?: 'busy' | 'free' | 'tentative'
  /** Organizer info */
  organizer?: EventAttendee
}

/**
 * Event input for creation/update
 */
export type EventInput = Omit<CalendarEvent, 'id'> & { id?: string }

/**
 * Event query options
 */
export interface EventQueryOptions {
  /** Calendar IDs to query (all if not specified) */
  calendarIds?: string[]
  /** Start date range (ISO string) */
  startDate?: string
  /** End date range (ISO string) */
  endDate?: string
  /** Search query */
  query?: string
  /** Maximum results */
  limit?: number
}

/**
 * Permission status
 */
export type CalendarPermissionStatus = 'granted' | 'denied' | 'limited' | 'prompt' | 'unsupported'

/**
 * Calendar capabilities
 */
export interface CalendarCapabilities {
  /** Whether calendar access is supported */
  supported: boolean
  /** Whether reading is supported */
  canRead: boolean
  /** Whether writing is supported */
  canWrite: boolean
  /** Whether reminders are supported */
  supportsReminders: boolean
  /** Whether recurrence is supported */
  supportsRecurrence: boolean
  /** Whether attendees are supported */
  supportsAttendees: boolean
}

/**
 * Calendar provider interface
 */
export interface CalendarProvider {
  /**
   * Get all calendars available on the device.
   * @returns An array of Calendar objects with their metadata.
   */
  getCalendars(): Promise<Calendar[]>

  /**
   * Query calendar events matching the given options.
   * @param options - Query filters (calendar IDs, date range, search text, limit).
   * @returns An array of matching CalendarEvent objects.
   */
  getEvents(options?: EventQueryOptions): Promise<CalendarEvent[]>

  /**
   * Get a single event by ID
   * @param eventId - Event ID
   * @param calendarId - Calendar ID
   */
  getEventById(eventId: string, calendarId: string): Promise<CalendarEvent | null>

  /**
   * Create a new event
   * @param event - Event data
   */
  createEvent(event: EventInput): Promise<CalendarEvent>

  /**
   * Update an existing event
   * @param eventId - Event ID
   * @param event - Updated event data
   */
  updateEvent(eventId: string, event: Partial<EventInput>): Promise<CalendarEvent>

  /**
   * Delete an event
   * @param eventId - Event ID
   * @param calendarId - Calendar ID
   */
  deleteEvent(eventId: string, calendarId: string): Promise<void>

  /**
   * Open native calendar for a date
   * @param date - Date to show
   */
  openCalendar(date?: Date): Promise<void>

  /**
   * Open event in native calendar
   * @param eventId - Event ID
   */
  openEvent(eventId: string): Promise<void>

  /**
   * Get permission status
   */
  getPermissionStatus(): Promise<CalendarPermissionStatus>

  /**
   * Request permission
   */
  requestPermission(): Promise<CalendarPermissionStatus>

  /**
   * Open system settings for calendar permission
   */
  openSettings(): Promise<void>

  /**
   * Get the platform's calendar capabilities.
   * @returns The capabilities indicating which calendar features are supported.
   */
  getCapabilities(): Promise<CalendarCapabilities>
}
