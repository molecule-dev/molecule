/**
 * Microsoft Calendar provider implementation.
 *
 * Wraps the Microsoft Graph v1.0 REST API (Outlook / Office 365 calendars)
 * behind the {@link CalendarProvider} contract. Each call accepts per-user
 * OAuth credentials and transparently refreshes the access token when
 * Microsoft responds with `401`. Refreshed credentials are returned on
 * every operation so callers can persist them.
 *
 * Token-bearing values (access tokens, refresh tokens, Authorization
 * headers, Microsoft `error_description` payloads that may include the
 * token) are NEVER thrown or logged — every error path is funneled
 * through {@link sanitizeError}.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import type {
  CalendarEvent,
  CalendarOperationResult,
  CalendarProvider,
  CalendarSummary,
  CalendarUserCredentials,
  EventAttendee,
  FindFreeSlotsOptions,
  FreeBusyResult,
  FreeSlot,
  ListEventsOptions,
} from '@molecule/api-calendar'
import type { HttpError, HttpRequestOptions, HttpResponse } from '@molecule/api-http'
import { del, get, patch, post } from '@molecule/api-http'

import type { MicrosoftCalendarProviderOptions } from './types.js'

const DEFAULT_API_BASE_URL = 'https://graph.microsoft.com/v1.0'
const DEFAULT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const DEFAULT_SCOPE = 'https://graph.microsoft.com/.default offline_access'
const DEFAULT_TIMEOUT_MS = 15_000

interface GraphCalendar {
  id: string
  name?: string
  description?: string
  isDefaultCalendar?: boolean
  canEdit?: boolean
  canShare?: boolean
  canViewPrivateItems?: boolean
  owner?: { name?: string; address?: string }
}

interface GraphCalendarListResponse {
  value?: GraphCalendar[]
}

interface GraphDateTimeTimeZone {
  dateTime?: string
  timeZone?: string
}

interface GraphAttendee {
  type?: 'required' | 'optional' | 'resource' | string
  status?: { response?: string; time?: string }
  emailAddress?: { name?: string; address?: string }
}

interface GraphEvent {
  id?: string
  subject?: string
  bodyPreview?: string
  body?: { contentType?: string; content?: string }
  location?: { displayName?: string }
  start?: GraphDateTimeTimeZone
  end?: GraphDateTimeTimeZone
  isAllDay?: boolean
  showAs?: string
  attendees?: GraphAttendee[]
  onlineMeeting?: { joinUrl?: string }
  onlineMeetingUrl?: string
  [k: string]: unknown
}

interface GraphEventsListResponse {
  value?: GraphEvent[]
}

interface GraphScheduleItem {
  status?: string
  start?: { dateTime?: string; timeZone?: string }
  end?: { dateTime?: string; timeZone?: string }
}

interface GraphScheduleEntry {
  scheduleId?: string
  scheduleItems?: GraphScheduleItem[]
}

interface GraphGetScheduleResponse {
  value?: GraphScheduleEntry[]
}

interface MicrosoftTokenRefreshResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
}

/**
 * Strips potentially-sensitive values (access tokens, refresh tokens,
 * Authorization headers, Microsoft `error_description` strings) out of any
 * thrown error and returns a safe, generic Error.
 *
 * Never include the original error's message verbatim — Microsoft's OAuth
 * responses can echo back the tokens.
 *
 * @param scope - Short label of the calling operation (e.g. `"listEvents"`).
 * @param error - The original error.
 * @returns A new Error safe to throw and log.
 */
const sanitizeError = (scope: string, error: unknown): Error => {
  const httpError = error as HttpError | undefined
  const status = httpError?.response?.status
  const code = httpError?.code
  const parts = [`Microsoft Calendar ${scope} failed`]
  if (status !== undefined) parts.push(`status=${status}`)
  if (code) parts.push(`code=${code}`)
  return new Error(parts.join(' '))
}

/**
 * Whether an HTTP error indicates an expired/invalid access token.
 *
 * @param error - The original error.
 * @returns True when the response status is 401.
 */
const isUnauthorized = (error: unknown): boolean => {
  return (error as HttpError | undefined)?.response?.status === 401
}

/**
 * Refreshes a user's access token using their refresh token.
 *
 * Microsoft's refresh-token flow may rotate the refresh token itself; when
 * a new one is issued we return it so callers can persist it.
 *
 * @param refreshToken - The user's refresh token.
 * @param clientId - OAuth client id.
 * @param clientSecret - OAuth client secret.
 * @param tokenUrl - Token endpoint URL.
 * @param scope - OAuth scope to request (must include `offline_access`).
 * @param timeoutMs - Request timeout.
 * @returns The fresh credentials.
 */
const refreshAccessToken = async (
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  tokenUrl: string,
  scope: string,
  timeoutMs: number,
): Promise<CalendarUserCredentials> => {
  try {
    const response = await post<MicrosoftTokenRefreshResponse>(
      tokenUrl,
      {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope,
      },
      {
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
        },
        timeout: timeoutMs,
      },
    )

    const accessToken = response.data.access_token
    if (!accessToken) {
      throw new Error('Microsoft Calendar token refresh failed: empty access_token in response')
    }

    const newRefreshToken = response.data.refresh_token ?? refreshToken
    const expiresIn = response.data.expires_in
    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt: typeof expiresIn === 'number' ? Date.now() + expiresIn * 1000 : undefined,
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Microsoft Calendar token refresh')) {
      throw error
    }
    throw sanitizeError('token refresh', error)
  }
}

/**
 * Computes free slots from a list of busy blocks within a window.
 *
 * Same algorithm as the Google bond's `computeFreeSlots`; inlined here so
 * sibling provider bonds remain independent of each other.
 *
 * @param busyBlocks - Busy blocks (any order; will be sorted).
 * @param windowStart - ISO 8601 lower bound of the search window.
 * @param windowEnd - ISO 8601 upper bound of the search window.
 * @param durationMinutes - Required slot duration in minutes.
 * @returns Free slots that fully fit within the window.
 */
export const computeFreeSlots = (
  busyBlocks: Array<{ start: string; end: string }>,
  windowStart: string,
  windowEnd: string,
  durationMinutes: number,
): FreeSlot[] => {
  const start = new Date(windowStart).getTime()
  const end = new Date(windowEnd).getTime()
  const durationMs = durationMinutes * 60 * 1000

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || durationMs <= 0) {
    return []
  }

  const normalized = busyBlocks
    .map((b) => ({
      start: new Date(b.start).getTime(),
      end: new Date(b.end).getTime(),
    }))
    .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end) && b.end > b.start)
    .map((b) => ({
      start: Math.max(b.start, start),
      end: Math.min(b.end, end),
    }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start)

  const merged: Array<{ start: number; end: number }> = []
  for (const block of normalized) {
    const last = merged[merged.length - 1]
    if (last && block.start <= last.end) {
      last.end = Math.max(last.end, block.end)
    } else {
      merged.push({ ...block })
    }
  }

  const freeSlots: FreeSlot[] = []
  let cursor = start
  for (const block of merged) {
    if (block.start - cursor >= durationMs) {
      freeSlots.push({
        start: new Date(cursor).toISOString(),
        end: new Date(block.start).toISOString(),
      })
    }
    cursor = Math.max(cursor, block.end)
  }
  if (end - cursor >= durationMs) {
    freeSlots.push({
      start: new Date(cursor).toISOString(),
      end: new Date(end).toISOString(),
    })
  }

  return freeSlots
}

/**
 * Microsoft Graph returns dateTime strings without a `Z` suffix even when
 * the timeZone field is `UTC`. This helper normalizes the value into a
 * proper ISO 8601 string using the accompanying timeZone.
 *
 * @param value - Microsoft Graph dateTimeTimeZone payload.
 * @returns Best-effort ISO 8601 string, or empty string when missing.
 */
const fromGraphDateTime = (value: GraphDateTimeTimeZone | undefined): string => {
  if (!value?.dateTime) return ''
  const tz = value.timeZone
  // Already absolute (has Z or +HH:MM offset).
  if (/Z$/.test(value.dateTime) || /[+-]\d{2}:?\d{2}$/.test(value.dateTime)) {
    return value.dateTime
  }
  if (tz === 'UTC') {
    return `${value.dateTime}Z`
  }
  return value.dateTime
}

/**
 * Translates a Microsoft Graph attendee into the normalized
 * {@link EventAttendee} shape, preserving the `optional` flag derived from
 * `attendee.type`.
 *
 * @param raw - Graph attendee payload.
 * @returns Normalized attendee, or `null` when no email is present.
 */
const fromGraphAttendee = (raw: GraphAttendee): EventAttendee | null => {
  const email = raw.emailAddress?.address
  if (!email) return null
  return {
    email,
    displayName: raw.emailAddress?.name,
    optional: raw.type === 'optional' || undefined,
    responseStatus: raw.status?.response,
  }
}

/**
 * Translates a Microsoft Graph event payload into the normalized
 * {@link CalendarEvent} shape.
 *
 * @param raw - Microsoft Graph event JSON.
 * @returns A normalized calendar event.
 */
const fromGraphEvent = (raw: GraphEvent): CalendarEvent => {
  const allDay = Boolean(raw.isAllDay)
  // For all-day events Graph stores midnight-UTC dateTime values; collapse
  // those to YYYY-MM-DD date-only strings so callers don't see fake times.
  const start = allDay ? (raw.start?.dateTime ?? '').slice(0, 10) : fromGraphDateTime(raw.start)
  const end = allDay ? (raw.end?.dateTime ?? '').slice(0, 10) : fromGraphDateTime(raw.end)

  const timeZone = raw.start?.timeZone ?? raw.end?.timeZone

  const attendees: EventAttendee[] | undefined = raw.attendees
    ?.map(fromGraphAttendee)
    .filter((a): a is EventAttendee => a !== null)

  const description = raw.body?.content ?? raw.bodyPreview

  // Map Graph `showAs` to the normalized status field where it makes sense.
  let status: string | undefined
  if (raw.showAs === 'free' || raw.showAs === 'workingElsewhere') status = 'tentative'
  else if (raw.showAs === 'tentative') status = 'tentative'
  else if (raw.showAs === 'busy' || raw.showAs === 'oof') status = 'confirmed'

  return {
    id: raw.id,
    summary: raw.subject ?? '',
    description,
    location: raw.location?.displayName,
    start,
    end,
    timeZone,
    allDay,
    attendees: attendees && attendees.length > 0 ? attendees : undefined,
    status,
    hangoutLink: raw.onlineMeeting?.joinUrl ?? raw.onlineMeetingUrl,
    metadata: { ...raw },
  }
}

/**
 * Translates a normalized {@link CalendarEvent} into a Microsoft Graph
 * `events` POST/PATCH payload.
 *
 * @param event - Normalized event payload.
 * @returns Microsoft Graph event JSON.
 */
const toGraphEvent = (event: Partial<CalendarEvent>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {}
  if (event.summary !== undefined) payload.subject = event.summary
  if (event.description !== undefined) {
    payload.body = { contentType: 'text', content: event.description }
  }
  if (event.location !== undefined) payload.location = { displayName: event.location }

  // Microsoft Graph requires a timeZone for non-all-day events. UTC is a
  // safe default when the caller didn't supply one.
  if (event.start !== undefined) {
    if (event.allDay) {
      payload.start = { dateTime: event.start, timeZone: 'UTC' }
    } else {
      payload.start = {
        dateTime: event.start,
        timeZone: event.timeZone ?? 'UTC',
      }
    }
  }
  if (event.end !== undefined) {
    if (event.allDay) {
      payload.end = { dateTime: event.end, timeZone: 'UTC' }
    } else {
      payload.end = {
        dateTime: event.end,
        timeZone: event.timeZone ?? 'UTC',
      }
    }
  }
  if (event.allDay !== undefined) payload.isAllDay = event.allDay

  if (event.attendees !== undefined) {
    payload.attendees = event.attendees.map((a) => ({
      type: a.optional ? 'optional' : 'required',
      emailAddress: {
        address: a.email,
        ...(a.displayName ? { name: a.displayName } : {}),
      },
    }))
  }

  // Graph has no general "status" field; we intentionally don't try to
  // round-trip CalendarEvent.status — it's read-only on this provider.

  return payload
}

/**
 * Encodes a Graph calendar id for use in a URL path.
 *
 * @param id - Calendar id.
 * @returns URL-encoded calendar id.
 */
const encodeCalendarId = (id: string): string => encodeURIComponent(id)

/**
 * Encodes a Graph event id for use in a URL path.
 *
 * @param id - Event id.
 * @returns URL-encoded event id.
 */
const encodeEventId = (id: string): string => encodeURIComponent(id)

/**
 * Creates a Microsoft Calendar provider.
 *
 * @param options - Optional configuration. Falls back to
 *   `OAUTH_MICROSOFT_CLIENT_ID` / `OAUTH_MICROSOFT_CLIENT_SECRET` env vars
 *   when `clientId` / `clientSecret` are omitted.
 * @returns A {@link CalendarProvider} implementation.
 */
export const createProvider = (
  options: MicrosoftCalendarProviderOptions = {},
): CalendarProvider => {
  const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL
  const tokenUrl = options.tokenUrl ?? DEFAULT_TOKEN_URL
  const scope = options.scope ?? DEFAULT_SCOPE
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const logger = getLogger()

  const getClientId = (): string => {
    const id = options.clientId ?? process.env.OAUTH_MICROSOFT_CLIENT_ID
    if (!id) {
      throw new Error(
        'Microsoft Calendar bond is missing OAUTH_MICROSOFT_CLIENT_ID (or clientId option).',
      )
    }
    return id
  }

  const getClientSecret = (): string => {
    const secret = options.clientSecret ?? process.env.OAUTH_MICROSOFT_CLIENT_SECRET
    if (!secret) {
      throw new Error(
        'Microsoft Calendar bond is missing OAUTH_MICROSOFT_CLIENT_SECRET (or clientSecret option).',
      )
    }
    return secret
  }

  /**
   * Calls a function with the user's access token, refreshing the token
   * once on a 401 response.
   *
   * @param scopeLabel - Calling-operation label for sanitized error messages.
   * @param credentials - The user's OAuth credentials.
   * @param call - Function that performs the HTTP request given an access token.
   * @returns The HTTP response and (if a refresh occurred) the new credentials.
   */
  const withAuth = async <T>(
    scopeLabel: string,
    credentials: CalendarUserCredentials,
    call: (accessToken: string) => Promise<HttpResponse<T>>,
  ): Promise<{ data: T; credentials?: CalendarUserCredentials }> => {
    let activeCredentials: CalendarUserCredentials = credentials
    let refreshed = false

    if (
      typeof activeCredentials.expiresAt === 'number' &&
      activeCredentials.expiresAt <= Date.now()
    ) {
      activeCredentials = await refreshAccessToken(
        credentials.refreshToken,
        getClientId(),
        getClientSecret(),
        tokenUrl,
        scope,
        timeoutMs,
      )
      refreshed = true
    }

    try {
      const response = await call(activeCredentials.accessToken)
      return { data: response.data, credentials: refreshed ? activeCredentials : undefined }
    } catch (error) {
      if (!isUnauthorized(error) || refreshed) {
        logger.error(`Microsoft Calendar ${scopeLabel} failed`, sanitizeError(scopeLabel, error))
        throw sanitizeError(scopeLabel, error)
      }
      try {
        activeCredentials = await refreshAccessToken(
          credentials.refreshToken,
          getClientId(),
          getClientSecret(),
          tokenUrl,
          scope,
          timeoutMs,
        )
        const response = await call(activeCredentials.accessToken)
        return { data: response.data, credentials: activeCredentials }
      } catch (retryError) {
        // Configuration errors are user-actionable and never carry tokens —
        // surface them as-is. Everything else is sanitized.
        if (
          retryError instanceof Error &&
          retryError.message.startsWith('Microsoft Calendar bond is missing ')
        ) {
          logger.error(`Microsoft Calendar ${scopeLabel} failed`, retryError)
          throw retryError
        }
        logger.error(
          `Microsoft Calendar ${scopeLabel} failed`,
          sanitizeError(scopeLabel, retryError),
        )
        throw sanitizeError(scopeLabel, retryError)
      }
    }
  }

  const authedRequestOptions = (
    accessToken: string,
    extra?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Omit<HttpRequestOptions, 'method' | 'body'> => ({
    ...extra,
    headers: {
      accept: 'application/json',
      ...(extra?.headers ?? {}),
      authorization: `Bearer ${accessToken}`,
    },
    timeout: extra?.timeout ?? timeoutMs,
  })

  return {
    async listCalendars(
      credentials: CalendarUserCredentials,
    ): Promise<CalendarOperationResult<CalendarSummary[]>> {
      const { data, credentials: refreshed } = await withAuth<GraphCalendarListResponse>(
        'listCalendars',
        credentials,
        (accessToken) =>
          get<GraphCalendarListResponse>(
            `${apiBaseUrl}/me/calendars`,
            authedRequestOptions(accessToken),
          ),
      )
      const calendars: CalendarSummary[] = (data.value ?? []).map((item) => ({
        id: item.id,
        summary: item.name ?? '',
        description: item.description,
        primary: item.isDefaultCalendar,
        // Graph doesn't expose a per-calendar timeZone on the list endpoint;
        // callers needing it should query the user's mailbox settings.
        accessRole: item.canEdit ? 'writer' : 'reader',
      }))
      return { data: calendars, credentials: refreshed }
    },

    async listEvents(
      credentials: CalendarUserCredentials,
      calendarId: string,
      listOptions: ListEventsOptions,
    ): Promise<CalendarOperationResult<CalendarEvent[]>> {
      // calendarView expands recurring events into individual instances —
      // this matches the normalized contract's "single events" semantics.
      const params: Record<string, string | number | boolean> = {
        startDateTime: listOptions.timeMin,
        endDateTime: listOptions.timeMax,
      }
      if (listOptions.maxResults !== undefined) params.$top = listOptions.maxResults
      if (listOptions.orderBy === 'startTime') {
        params.$orderby = 'start/dateTime'
      } else if (listOptions.orderBy === 'updated') {
        params.$orderby = 'lastModifiedDateTime'
      } else {
        params.$orderby = 'start/dateTime'
      }

      const { data, credentials: refreshed } = await withAuth<GraphEventsListResponse>(
        'listEvents',
        credentials,
        (accessToken) =>
          get<GraphEventsListResponse>(
            `${apiBaseUrl}/me/calendars/${encodeCalendarId(calendarId)}/calendarView`,
            authedRequestOptions(accessToken, { params }),
          ),
      )
      const events = (data.value ?? []).map(fromGraphEvent)
      return { data: events, credentials: refreshed }
    },

    async createEvent(
      credentials: CalendarUserCredentials,
      calendarId: string,
      event: CalendarEvent,
    ): Promise<CalendarOperationResult<CalendarEvent>> {
      const body = toGraphEvent(event)
      const { data, credentials: refreshed } = await withAuth<GraphEvent>(
        'createEvent',
        credentials,
        (accessToken) =>
          post<GraphEvent>(
            `${apiBaseUrl}/me/calendars/${encodeCalendarId(calendarId)}/events`,
            body,
            authedRequestOptions(accessToken, { headers: { 'content-type': 'application/json' } }),
          ),
      )
      return { data: fromGraphEvent(data), credentials: refreshed }
    },

    async updateEvent(
      credentials: CalendarUserCredentials,
      calendarId: string,
      eventId: string,
      updates: Partial<Omit<CalendarEvent, 'id'>>,
    ): Promise<CalendarOperationResult<CalendarEvent>> {
      const body = toGraphEvent(updates)
      const { data, credentials: refreshed } = await withAuth<GraphEvent>(
        'updateEvent',
        credentials,
        (accessToken) =>
          patch<GraphEvent>(
            `${apiBaseUrl}/me/calendars/${encodeCalendarId(calendarId)}/events/${encodeEventId(eventId)}`,
            body,
            authedRequestOptions(accessToken, { headers: { 'content-type': 'application/json' } }),
          ),
      )
      return { data: fromGraphEvent(data), credentials: refreshed }
    },

    async deleteEvent(
      credentials: CalendarUserCredentials,
      calendarId: string,
      eventId: string,
    ): Promise<CalendarOperationResult<void>> {
      const { credentials: refreshed } = await withAuth<unknown>(
        'deleteEvent',
        credentials,
        (accessToken) =>
          del<unknown>(
            `${apiBaseUrl}/me/calendars/${encodeCalendarId(calendarId)}/events/${encodeEventId(eventId)}`,
            authedRequestOptions(accessToken),
          ),
      )
      return { data: undefined, credentials: refreshed }
    },

    async findFreeSlots(
      credentials: CalendarUserCredentials,
      calendarIds: string[],
      freeBusyOptions: FindFreeSlotsOptions,
    ): Promise<CalendarOperationResult<FreeBusyResult>> {
      // Microsoft Graph's getSchedule expects schedule "addresses" (calendar
      // ids / email aliases) plus a TZ-bound start/end. We pass UTC unless
      // the caller specified otherwise.
      const requestTimeZone = freeBusyOptions.timeZone ?? 'UTC'
      const requestBody = {
        schedules: calendarIds,
        startTime: { dateTime: freeBusyOptions.timeMin, timeZone: requestTimeZone },
        endTime: { dateTime: freeBusyOptions.timeMax, timeZone: requestTimeZone },
        availabilityViewInterval: 30,
      }

      const { data, credentials: refreshed } = await withAuth<GraphGetScheduleResponse>(
        'findFreeSlots',
        credentials,
        (accessToken) =>
          post<GraphGetScheduleResponse>(
            `${apiBaseUrl}/me/calendar/getSchedule`,
            requestBody,
            authedRequestOptions(accessToken, { headers: { 'content-type': 'application/json' } }),
          ),
      )

      const busyBlocks: Array<{ start: string; end: string; calendarId: string }> = []
      const entries = data.value ?? []
      for (let i = 0; i < calendarIds.length; i++) {
        const calendarId = calendarIds[i]
        const entry = entries.find((e) => e.scheduleId === calendarId) ?? entries[i]
        const items = entry?.scheduleItems ?? []
        for (const item of items) {
          // Anything that isn't free counts as busy from the booking
          // standpoint (busy / tentative / oof / workingElsewhere).
          if (item.status === 'free') continue
          const start = fromGraphDateTime(item.start)
          const end = fromGraphDateTime(item.end)
          if (!start || !end) continue
          busyBlocks.push({ start, end, calendarId })
        }
      }

      const freeSlots = computeFreeSlots(
        busyBlocks,
        freeBusyOptions.timeMin,
        freeBusyOptions.timeMax,
        freeBusyOptions.durationMinutes,
      )

      return {
        data: { busy: busyBlocks, freeSlots },
        credentials: refreshed,
      }
    },
  }
}
