/**
 * Google Calendar provider implementation.
 *
 * Wraps the Google Calendar v3 REST API behind the
 * {@link CalendarProvider} contract. Each call accepts per-user OAuth
 * credentials and transparently refreshes the access token when Google
 * responds with `401`. Refreshed credentials are returned on every
 * operation so callers can persist them.
 *
 * Token-bearing values (access tokens, refresh tokens, Authorization
 * headers, Google `error_description` payloads that may include the
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

import type { GoogleCalendarProviderOptions } from './types.js'

const DEFAULT_API_BASE_URL = 'https://www.googleapis.com/calendar/v3'
const DEFAULT_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DEFAULT_TIMEOUT_MS = 15_000

interface GoogleCalendarListItem {
  id: string
  summary: string
  description?: string
  timeZone?: string
  primary?: boolean
  accessRole?: string
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarListItem[]
}

interface GoogleEventDateTime {
  date?: string
  dateTime?: string
  timeZone?: string
}

interface GoogleEvent {
  id?: string
  summary?: string
  description?: string
  location?: string
  start?: GoogleEventDateTime
  end?: GoogleEventDateTime
  attendees?: Array<{
    email?: string
    displayName?: string
    optional?: boolean
    responseStatus?: string
  }>
  status?: string
  hangoutLink?: string
  [k: string]: unknown
}

interface GoogleEventsListResponse {
  items?: GoogleEvent[]
}

interface GoogleFreeBusyResponse {
  calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>
}

interface GoogleTokenRefreshResponse {
  access_token: string
  expires_in?: number
  token_type?: string
  scope?: string
}

/**
 * Strips potentially-sensitive values (access tokens, refresh tokens,
 * Authorization headers, Google `error_description` strings) out of any
 * thrown error and returns a safe, generic Error.
 *
 * Never include the original error's message verbatim — Google's OAuth
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
  const parts = [`Google Calendar ${scope} failed`]
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
 * @param refreshToken - The user's refresh token.
 * @param clientId - OAuth client id.
 * @param clientSecret - OAuth client secret.
 * @param tokenUrl - Token endpoint URL.
 * @param timeoutMs - Request timeout.
 * @returns The fresh credentials (access token + same refresh token).
 */
const refreshAccessToken = async (
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  tokenUrl: string,
  timeoutMs: number,
): Promise<CalendarUserCredentials> => {
  try {
    const response = await post<GoogleTokenRefreshResponse>(
      tokenUrl,
      {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      },
      {
        headers: { accept: 'application/json' },
        timeout: timeoutMs,
      },
    )

    const accessToken = response.data.access_token
    if (!accessToken) {
      throw new Error('Google Calendar token refresh failed: empty access_token in response')
    }

    const expiresIn = response.data.expires_in
    return {
      accessToken,
      refreshToken,
      expiresAt: typeof expiresIn === 'number' ? Date.now() + expiresIn * 1000 : undefined,
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Google Calendar token refresh')) {
      throw error
    }
    throw sanitizeError('token refresh', error)
  }
}

/**
 * Computes free slots from a sorted list of busy blocks.
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

  // Normalize + sort + clamp to window + merge overlaps.
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
 * Translates a Google Calendar v3 event payload into the normalized
 * {@link CalendarEvent} shape.
 *
 * @param raw - Google's event JSON.
 * @returns A normalized calendar event.
 */
const fromGoogleEvent = (raw: GoogleEvent): CalendarEvent => {
  const allDay = Boolean(raw.start?.date && !raw.start?.dateTime)
  const start = raw.start?.dateTime ?? raw.start?.date ?? ''
  const end = raw.end?.dateTime ?? raw.end?.date ?? ''
  const timeZone = raw.start?.timeZone ?? raw.end?.timeZone

  const attendees: EventAttendee[] | undefined = raw.attendees
    ?.filter((a): a is { email: string } & typeof a => Boolean(a.email))
    .map((a) => ({
      email: a.email,
      displayName: a.displayName,
      optional: a.optional,
      responseStatus: a.responseStatus,
    }))

  return {
    id: raw.id,
    summary: raw.summary ?? '',
    description: raw.description,
    location: raw.location,
    start,
    end,
    timeZone,
    allDay,
    attendees,
    status: raw.status,
    hangoutLink: raw.hangoutLink,
    metadata: { ...raw },
  }
}

/**
 * Translates a normalized {@link CalendarEvent} into Google Calendar v3's
 * `events.insert` / `events.patch` payload shape.
 *
 * @param event - Normalized event payload.
 * @returns Google Calendar v3 event JSON.
 */
const toGoogleEvent = (event: Partial<CalendarEvent>): Record<string, unknown> => {
  const payload: Record<string, unknown> = {}
  if (event.summary !== undefined) payload.summary = event.summary
  if (event.description !== undefined) payload.description = event.description
  if (event.location !== undefined) payload.location = event.location
  if (event.start !== undefined) {
    payload.start = event.allDay
      ? { date: event.start }
      : { dateTime: event.start, ...(event.timeZone ? { timeZone: event.timeZone } : {}) }
  }
  if (event.end !== undefined) {
    payload.end = event.allDay
      ? { date: event.end }
      : { dateTime: event.end, ...(event.timeZone ? { timeZone: event.timeZone } : {}) }
  }
  if (event.attendees !== undefined) {
    payload.attendees = event.attendees.map((a) => ({
      email: a.email,
      displayName: a.displayName,
      optional: a.optional,
      responseStatus: a.responseStatus,
    }))
  }
  if (event.status !== undefined) payload.status = event.status
  return payload
}

/**
 * Encodes a Google Calendar id for use in a URL path. Calendar IDs can
 * be email addresses, so we URL-encode them.
 *
 * @param id - Calendar id.
 * @returns URL-encoded calendar id.
 */
const encodeCalendarId = (id: string): string => encodeURIComponent(id)

/**
 * Encodes a Google Calendar event id for use in a URL path.
 *
 * @param id - Event id.
 * @returns URL-encoded event id.
 */
const encodeEventId = (id: string): string => encodeURIComponent(id)

/**
 * Creates a Google Calendar provider.
 *
 * @param options - Optional configuration. Falls back to
 *   `OAUTH_GOOGLE_CLIENT_ID` / `OAUTH_GOOGLE_CLIENT_SECRET` env vars when
 *   `clientId` / `clientSecret` are omitted.
 * @returns A {@link CalendarProvider} implementation.
 */
export const createProvider = (options: GoogleCalendarProviderOptions = {}): CalendarProvider => {
  const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL
  const tokenUrl = options.tokenUrl ?? DEFAULT_TOKEN_URL
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const logger = getLogger()

  const getClientId = (): string => {
    const id = options.clientId ?? process.env.OAUTH_GOOGLE_CLIENT_ID
    if (!id) {
      throw new Error(
        'Google Calendar bond is missing OAUTH_GOOGLE_CLIENT_ID (or clientId option).',
      )
    }
    return id
  }

  const getClientSecret = (): string => {
    const secret = options.clientSecret ?? process.env.OAUTH_GOOGLE_CLIENT_SECRET
    if (!secret) {
      throw new Error(
        'Google Calendar bond is missing OAUTH_GOOGLE_CLIENT_SECRET (or clientSecret option).',
      )
    }
    return secret
  }

  /**
   * Calls a function with the user's access token, refreshing the token
   * once on a 401 response.
   *
   * @param scope - Calling-operation label for sanitized error messages.
   * @param credentials - The user's OAuth credentials.
   * @param call - Function that performs the HTTP request given an access token.
   * @returns The HTTP response and (if a refresh occurred) the new credentials.
   */
  const withAuth = async <T>(
    scope: string,
    credentials: CalendarUserCredentials,
    call: (accessToken: string) => Promise<HttpResponse<T>>,
  ): Promise<{ data: T; credentials?: CalendarUserCredentials }> => {
    let activeCredentials: CalendarUserCredentials = credentials
    let refreshed = false

    // Proactively refresh if expiresAt is in the past.
    if (
      typeof activeCredentials.expiresAt === 'number' &&
      activeCredentials.expiresAt <= Date.now()
    ) {
      activeCredentials = await refreshAccessToken(
        credentials.refreshToken,
        getClientId(),
        getClientSecret(),
        tokenUrl,
        timeoutMs,
      )
      refreshed = true
    }

    try {
      const response = await call(activeCredentials.accessToken)
      return { data: response.data, credentials: refreshed ? activeCredentials : undefined }
    } catch (error) {
      if (!isUnauthorized(error) || refreshed) {
        logger.error(`Google Calendar ${scope} failed`, sanitizeError(scope, error))
        throw sanitizeError(scope, error)
      }
      try {
        activeCredentials = await refreshAccessToken(
          credentials.refreshToken,
          getClientId(),
          getClientSecret(),
          tokenUrl,
          timeoutMs,
        )
        const response = await call(activeCredentials.accessToken)
        return { data: response.data, credentials: activeCredentials }
      } catch (retryError) {
        // Configuration errors are user-actionable and never carry tokens —
        // surface them as-is. Everything else is sanitized.
        if (
          retryError instanceof Error &&
          retryError.message.startsWith('Google Calendar bond is missing ')
        ) {
          logger.error(`Google Calendar ${scope} failed`, retryError)
          throw retryError
        }
        logger.error(`Google Calendar ${scope} failed`, sanitizeError(scope, retryError))
        throw sanitizeError(scope, retryError)
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
      const { data, credentials: refreshed } = await withAuth<GoogleCalendarListResponse>(
        'listCalendars',
        credentials,
        (accessToken) =>
          get<GoogleCalendarListResponse>(
            `${apiBaseUrl}/users/me/calendarList`,
            authedRequestOptions(accessToken),
          ),
      )
      const calendars: CalendarSummary[] = (data.items ?? []).map((item) => ({
        id: item.id,
        summary: item.summary,
        description: item.description,
        timeZone: item.timeZone,
        primary: item.primary,
        accessRole: item.accessRole,
      }))
      return { data: calendars, credentials: refreshed }
    },

    async listEvents(
      credentials: CalendarUserCredentials,
      calendarId: string,
      listOptions: ListEventsOptions,
    ): Promise<CalendarOperationResult<CalendarEvent[]>> {
      const params: Record<string, string | number | boolean> = {
        timeMin: listOptions.timeMin,
        timeMax: listOptions.timeMax,
        singleEvents: listOptions.singleEvents ?? true,
        orderBy: listOptions.orderBy ?? 'startTime',
      }
      if (listOptions.maxResults !== undefined) params.maxResults = listOptions.maxResults

      const { data, credentials: refreshed } = await withAuth<GoogleEventsListResponse>(
        'listEvents',
        credentials,
        (accessToken) =>
          get<GoogleEventsListResponse>(
            `${apiBaseUrl}/calendars/${encodeCalendarId(calendarId)}/events`,
            authedRequestOptions(accessToken, { params }),
          ),
      )
      const events = (data.items ?? []).map(fromGoogleEvent)
      return { data: events, credentials: refreshed }
    },

    async createEvent(
      credentials: CalendarUserCredentials,
      calendarId: string,
      event: CalendarEvent,
    ): Promise<CalendarOperationResult<CalendarEvent>> {
      const body = toGoogleEvent(event)
      const { data, credentials: refreshed } = await withAuth<GoogleEvent>(
        'createEvent',
        credentials,
        (accessToken) =>
          post<GoogleEvent>(
            `${apiBaseUrl}/calendars/${encodeCalendarId(calendarId)}/events`,
            body,
            authedRequestOptions(accessToken, { headers: { 'content-type': 'application/json' } }),
          ),
      )
      return { data: fromGoogleEvent(data), credentials: refreshed }
    },

    async updateEvent(
      credentials: CalendarUserCredentials,
      calendarId: string,
      eventId: string,
      updates: Partial<Omit<CalendarEvent, 'id'>>,
    ): Promise<CalendarOperationResult<CalendarEvent>> {
      const body = toGoogleEvent(updates)
      const { data, credentials: refreshed } = await withAuth<GoogleEvent>(
        'updateEvent',
        credentials,
        (accessToken) =>
          patch<GoogleEvent>(
            `${apiBaseUrl}/calendars/${encodeCalendarId(calendarId)}/events/${encodeEventId(eventId)}`,
            body,
            authedRequestOptions(accessToken, { headers: { 'content-type': 'application/json' } }),
          ),
      )
      return { data: fromGoogleEvent(data), credentials: refreshed }
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
            `${apiBaseUrl}/calendars/${encodeCalendarId(calendarId)}/events/${encodeEventId(eventId)}`,
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
      const requestBody = {
        timeMin: freeBusyOptions.timeMin,
        timeMax: freeBusyOptions.timeMax,
        ...(freeBusyOptions.timeZone ? { timeZone: freeBusyOptions.timeZone } : {}),
        items: calendarIds.map((id) => ({ id })),
      }

      const { data, credentials: refreshed } = await withAuth<GoogleFreeBusyResponse>(
        'findFreeSlots',
        credentials,
        (accessToken) =>
          post<GoogleFreeBusyResponse>(
            `${apiBaseUrl}/freeBusy`,
            requestBody,
            authedRequestOptions(accessToken, { headers: { 'content-type': 'application/json' } }),
          ),
      )

      const busyBlocks: Array<{ start: string; end: string; calendarId: string }> = []
      const calendarsResp = data.calendars ?? {}
      for (const id of calendarIds) {
        for (const block of calendarsResp[id]?.busy ?? []) {
          busyBlocks.push({ start: block.start, end: block.end, calendarId: id })
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
