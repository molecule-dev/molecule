/**
 * Type definitions for the calendar core interface.
 *
 * Defines a stack-neutral contract for calendar bonds (Google, Microsoft,
 * iCloud, etc.) used on the API/server side. Calendar identifiers are opaque
 * provider strings — a Google `calendarId` is a Google email/ID, a Microsoft
 * `calendarId` is a Graph calendar ID, and so on. Times are ISO 8601 strings
 * to avoid timezone drift across providers.
 *
 * @module
 */

/**
 * A single calendar in a user's calendar list.
 */
export interface CalendarSummary {
  /** Provider-specific calendar identifier (opaque). */
  id: string
  /** Human-readable calendar name. */
  summary: string
  /** Optional longer description. */
  description?: string
  /** IANA time zone, e.g. `America/Los_Angeles`. */
  timeZone?: string
  /** Whether this calendar is the user's primary calendar. */
  primary?: boolean
  /** Access role granted to the authenticated user (provider-specific). */
  accessRole?: string
}

/**
 * Attendee information attached to a calendar event.
 */
export interface EventAttendee {
  /** Attendee email address. */
  email: string
  /** Optional display name. */
  displayName?: string
  /** Whether attendance is optional. */
  optional?: boolean
  /** RSVP response status (provider-specific values). */
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted' | string
}

/**
 * A calendar event.
 *
 * Times are ISO 8601 strings. For all-day events, prefer date-only strings
 * (`YYYY-MM-DD`) and set {@link CalendarEvent.allDay} to `true`.
 */
export interface CalendarEvent {
  /** Provider-specific event identifier. May be undefined for new events. */
  id?: string
  /** Event title (caller is responsible for any i18n on user-visible text). */
  summary: string
  /** Optional rich description / notes. */
  description?: string
  /** Event location string. */
  location?: string
  /** ISO 8601 start (date-time, or `YYYY-MM-DD` if all-day). */
  start: string
  /** ISO 8601 end (date-time, or `YYYY-MM-DD` if all-day). */
  end: string
  /** IANA time zone for the start/end values. */
  timeZone?: string
  /** Whether this event spans entire day(s). Defaults to `false`. */
  allDay?: boolean
  /** Optional attendee list. */
  attendees?: EventAttendee[]
  /** Provider-specific status flag (`confirmed`, `tentative`, `cancelled`). */
  status?: 'confirmed' | 'tentative' | 'cancelled' | string
  /** Conferencing / meeting link, if present. */
  hangoutLink?: string
  /** Arbitrary provider data (kept for round-tripping). */
  metadata?: Record<string, unknown>
}

/**
 * Query parameters for listing events on a calendar.
 */
export interface ListEventsOptions {
  /** ISO 8601 lower bound (inclusive). */
  timeMin: string
  /** ISO 8601 upper bound (exclusive). */
  timeMax: string
  /** Maximum number of events to return. Provider-defined cap when omitted. */
  maxResults?: number
  /** When true, recurring events are returned as individual instances. */
  singleEvents?: boolean
  /** Optional sort order — `startTime` is provider-supported by Google. */
  orderBy?: 'startTime' | 'updated'
}

/**
 * Query parameters for the free/busy / free-slot computation.
 */
export interface FindFreeSlotsOptions {
  /** ISO 8601 lower bound (inclusive). */
  timeMin: string
  /** ISO 8601 upper bound (exclusive). */
  timeMax: string
  /** Required slot duration in minutes. */
  durationMinutes: number
  /** Optional IANA time zone for the returned slot boundaries. */
  timeZone?: string
}

/**
 * A contiguous busy block returned from a free/busy query.
 */
export interface BusyBlock {
  /** ISO 8601 start of the busy block. */
  start: string
  /** ISO 8601 end of the busy block. */
  end: string
  /** Originating calendar id. */
  calendarId: string
}

/**
 * A free slot of {@link FindFreeSlotsOptions.durationMinutes} length.
 */
export interface FreeSlot {
  /** ISO 8601 slot start. */
  start: string
  /** ISO 8601 slot end. */
  end: string
}

/**
 * Result of a free/busy lookup plus computed free slots.
 */
export interface FreeBusyResult {
  /** Aggregated busy blocks across all queried calendars. */
  busy: BusyBlock[]
  /** Computed free slots that fit `durationMinutes`. */
  freeSlots: FreeSlot[]
}

/**
 * OAuth token bundle for a single user. Bonds use these to call the
 * provider's API on behalf of that user, refreshing the access token
 * automatically when it expires.
 */
export interface CalendarUserCredentials {
  /** Current access token. */
  accessToken: string
  /** Refresh token used to mint new access tokens. */
  refreshToken: string
  /** Optional epoch-millis timestamp for the access token's expiry. */
  expiresAt?: number
}

/**
 * Calendar provider contract.
 *
 * Every method takes user-scoped {@link CalendarUserCredentials} so the
 * same provider instance can serve multiple users. Implementations are
 * responsible for refreshing expired tokens transparently and returning
 * any updated credentials via {@link CalendarOperationResult.credentials}.
 */
export interface CalendarProvider {
  /**
   * Lists the calendars accessible to the authenticated user.
   *
   * @param credentials - The user's OAuth credentials.
   * @returns The user's calendar list and any refreshed credentials.
   */
  listCalendars(
    credentials: CalendarUserCredentials,
  ): Promise<CalendarOperationResult<CalendarSummary[]>>

  /**
   * Lists events on a specific calendar within a time window.
   *
   * @param credentials - The user's OAuth credentials.
   * @param calendarId - Provider-specific calendar id.
   * @param options - Time range and paging options.
   */
  listEvents(
    credentials: CalendarUserCredentials,
    calendarId: string,
    options: ListEventsOptions,
  ): Promise<CalendarOperationResult<CalendarEvent[]>>

  /**
   * Creates a new event on a calendar.
   *
   * @param credentials - The user's OAuth credentials.
   * @param calendarId - Provider-specific calendar id.
   * @param event - Event payload (id is ignored; provider assigns one).
   */
  createEvent(
    credentials: CalendarUserCredentials,
    calendarId: string,
    event: CalendarEvent,
  ): Promise<CalendarOperationResult<CalendarEvent>>

  /**
   * Updates an existing event by id.
   *
   * @param credentials - The user's OAuth credentials.
   * @param calendarId - Provider-specific calendar id.
   * @param eventId - Event id to update.
   * @param updates - Partial event payload to merge.
   */
  updateEvent(
    credentials: CalendarUserCredentials,
    calendarId: string,
    eventId: string,
    updates: Partial<Omit<CalendarEvent, 'id'>>,
  ): Promise<CalendarOperationResult<CalendarEvent>>

  /**
   * Deletes an event by id.
   *
   * @param credentials - The user's OAuth credentials.
   * @param calendarId - Provider-specific calendar id.
   * @param eventId - Event id to delete.
   */
  deleteEvent(
    credentials: CalendarUserCredentials,
    calendarId: string,
    eventId: string,
  ): Promise<CalendarOperationResult<void>>

  /**
   * Computes free slots across one or more calendars.
   *
   * @param credentials - The user's OAuth credentials.
   * @param calendarIds - One or more provider-specific calendar ids.
   * @param options - Time window and slot duration.
   */
  findFreeSlots(
    credentials: CalendarUserCredentials,
    calendarIds: string[],
    options: FindFreeSlotsOptions,
  ): Promise<CalendarOperationResult<FreeBusyResult>>
}

/**
 * Wrapper returned from every {@link CalendarProvider} method so callers
 * can persist refreshed credentials when the provider rotates them.
 */
export interface CalendarOperationResult<T> {
  /** Operation payload. `void` operations return `undefined`. */
  data: T
  /**
   * Refreshed credentials, present iff the access token was rotated during
   * this call. Callers MUST persist these so subsequent calls succeed.
   */
  credentials?: CalendarUserCredentials
}
