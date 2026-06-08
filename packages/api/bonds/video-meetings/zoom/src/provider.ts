/**
 * Zoom implementation of the molecule {@link VideoMeetingsProvider}
 * interface.
 *
 * Wraps the Zoom REST v2 API (`https://api.zoom.us/v2`) to provide
 * scheduled-meeting lifecycle and listing conforming to
 * `@molecule/api-video-meetings`.
 *
 * @module
 */

import type {
  CreateMeetingOptions,
  ListMeetingsOptions,
  Meeting,
  MeetingPage,
  MeetingSettings,
  MeetingType,
  UpdateMeetingOptions,
  VideoMeetingsProvider,
} from '@molecule/api-video-meetings'

import type { ZoomVideoMeetingsConfig } from './types.js'

const DEFAULT_BASE_URL = 'https://api.zoom.us/v2'
const DEFAULT_OAUTH_URL = 'https://zoom.us/oauth/token'

/** Zoom numeric meeting types. */
const ZOOM_MEETING_TYPE = {
  instant: 1,
  scheduled: 2,
  recurringNoFixedTime: 3,
  recurring: 8,
} as const

/**
 * Maps a Zoom numeric meeting type back onto the molecule
 * {@link MeetingType}. Returns `undefined` for types that do not have a
 * direct molecule analogue (e.g. PMI).
 *
 * @param value - The Zoom numeric meeting type.
 * @returns The normalised meeting type, or `undefined`.
 */
function fromZoomMeetingType(value: number | undefined): MeetingType | undefined {
  switch (value) {
    case ZOOM_MEETING_TYPE.instant:
      return 'instant'
    case ZOOM_MEETING_TYPE.scheduled:
      return 'scheduled'
    case ZOOM_MEETING_TYPE.recurringNoFixedTime:
    case ZOOM_MEETING_TYPE.recurring:
      return 'recurring'
    default:
      return undefined
  }
}

/**
 * Maps the molecule {@link MeetingType} onto Zoom's numeric meeting type.
 * Defaults to `scheduled` (2) when nothing is specified but a `startTime`
 * is given, and `instant` (1) otherwise.
 *
 * @param type - The molecule meeting type, if specified.
 * @param hasStartTime - Whether a start time was supplied.
 * @returns The Zoom numeric meeting type.
 */
function toZoomMeetingType(type: MeetingType | undefined, hasStartTime: boolean): number {
  if (type === 'instant') return ZOOM_MEETING_TYPE.instant
  if (type === 'recurring') return ZOOM_MEETING_TYPE.recurring
  if (type === 'scheduled') return ZOOM_MEETING_TYPE.scheduled
  return hasStartTime ? ZOOM_MEETING_TYPE.scheduled : ZOOM_MEETING_TYPE.instant
}

interface ZoomMeetingSettings {
  host_video?: boolean
  participant_video?: boolean
  join_before_host?: boolean
  mute_upon_entry?: boolean
  waiting_room?: boolean
  auto_recording?: 'none' | 'local' | 'cloud'
  [extra: string]: unknown
}

interface ZoomMeetingResponse {
  id?: number | string
  topic?: string
  agenda?: string
  type?: number
  start_time?: string
  duration?: number
  timezone?: string
  password?: string
  join_url?: string
  start_url?: string
  settings?: ZoomMeetingSettings
}

interface ZoomMeetingListResponse {
  meetings?: ZoomMeetingResponse[]
  next_page_token?: string
}

interface ZoomTokenResponse {
  access_token?: string
  expires_in?: number
  scope?: string
  token_type?: string
}

/**
 * Maps a normalised molecule {@link MeetingSettings} onto Zoom's settings
 * payload. Unknown fields in `extra` are forwarded verbatim.
 *
 * @param settings - The normalised meeting settings.
 * @returns The Zoom settings payload, or `undefined` if no fields apply.
 */
function toZoomSettings(settings: MeetingSettings | undefined): ZoomMeetingSettings | undefined {
  if (!settings) return undefined
  const out: ZoomMeetingSettings = {}
  if (settings.hostVideo !== undefined) out.host_video = settings.hostVideo
  if (settings.participantVideo !== undefined) out.participant_video = settings.participantVideo
  if (settings.joinBeforeHost !== undefined) out.join_before_host = settings.joinBeforeHost
  if (settings.muteUponEntry !== undefined) out.mute_upon_entry = settings.muteUponEntry
  if (settings.waitingRoom !== undefined) out.waiting_room = settings.waitingRoom
  if (settings.autoRecording !== undefined) out.auto_recording = settings.autoRecording
  if (settings.extra) {
    for (const [k, v] of Object.entries(settings.extra)) {
      out[k] = v
    }
  }
  return Object.keys(out).length === 0 ? undefined : out
}

/**
 * Maps a Zoom settings payload onto the normalised molecule
 * {@link MeetingSettings}. Unknown fields are preserved under `extra`.
 *
 * @param settings - The Zoom settings payload.
 * @returns The normalised meeting settings, or `undefined` if no fields apply.
 */
function fromZoomSettings(settings: ZoomMeetingSettings | undefined): MeetingSettings | undefined {
  if (!settings) return undefined
  const known = new Set([
    'host_video',
    'participant_video',
    'join_before_host',
    'mute_upon_entry',
    'waiting_room',
    'auto_recording',
  ])
  const out: MeetingSettings = {}
  if (settings.host_video !== undefined) out.hostVideo = settings.host_video
  if (settings.participant_video !== undefined) out.participantVideo = settings.participant_video
  if (settings.join_before_host !== undefined) out.joinBeforeHost = settings.join_before_host
  if (settings.mute_upon_entry !== undefined) out.muteUponEntry = settings.mute_upon_entry
  if (settings.waiting_room !== undefined) out.waitingRoom = settings.waiting_room
  if (settings.auto_recording !== undefined) out.autoRecording = settings.auto_recording

  const extra: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(settings)) {
    if (!known.has(k)) extra[k] = v
  }
  if (Object.keys(extra).length > 0) out.extra = extra
  return Object.keys(out).length === 0 ? undefined : out
}

/**
 * Maps a Zoom meeting response onto the normalised molecule {@link Meeting}.
 *
 * @param data - The Zoom meeting response payload.
 * @returns The normalised meeting.
 */
function mapMeeting(data: ZoomMeetingResponse): Meeting {
  const meeting: Meeting = {
    id: String(data.id ?? ''),
    topic: data.topic ?? '',
    joinUrl: data.join_url ?? '',
  }
  if (data.start_url !== undefined) meeting.startUrl = data.start_url
  if (data.id !== undefined) meeting.meetingCode = String(data.id)
  if (data.password !== undefined) meeting.password = data.password
  if (data.start_time !== undefined) meeting.startTime = new Date(data.start_time)
  if (data.duration !== undefined) meeting.durationMinutes = data.duration
  if (data.agenda !== undefined) meeting.agenda = data.agenda
  if (data.timezone !== undefined) meeting.timezone = data.timezone
  const t = fromZoomMeetingType(data.type)
  if (t !== undefined) meeting.type = t
  const settings = fromZoomSettings(data.settings)
  if (settings !== undefined) meeting.settings = settings
  return meeting
}

/**
 * Builds the Zoom-shaped create/update body from molecule options.
 *
 * @param options - The molecule create or update options.
 * @returns The Zoom request body.
 */
function buildMeetingBody(
  options: CreateMeetingOptions | UpdateMeetingOptions,
  isCreate: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if (options.topic !== undefined) body.topic = options.topic
  if (options.agenda !== undefined) body.agenda = options.agenda
  if (options.password !== undefined) body.password = options.password
  if (options.durationMinutes !== undefined) body.duration = options.durationMinutes
  if (options.startTime !== undefined) body.start_time = options.startTime.toISOString()
  if (options.timezone !== undefined) body.timezone = options.timezone

  if (isCreate) {
    const create = options as CreateMeetingOptions
    body.type = toZoomMeetingType(create.type, create.startTime !== undefined)
  }

  const settings = toZoomSettings(options.settings)
  if (settings !== undefined) body.settings = settings

  return body
}

/**
 * Maps the molecule {@link ListMeetingsOptions.type} filter onto Zoom's
 * type query parameter.
 *
 * @param value - The molecule list-meetings type filter.
 * @returns The Zoom type query value.
 */
function toZoomListType(
  value: ListMeetingsOptions['type'] | undefined,
): 'scheduled' | 'live' | 'upcoming' | undefined {
  if (value === undefined) return 'scheduled'
  if (value === 'scheduled' || value === 'live' || value === 'upcoming') return value
  if (value === 'instant') return 'live'
  if (value === 'recurring') return 'scheduled'
  return 'scheduled'
}

/**
 * Creates a Zoom-backed {@link VideoMeetingsProvider}.
 *
 * @param config - Zoom provider configuration. When no `accessToken`
 *   resolver is supplied, the Server-to-Server OAuth credentials are read
 *   from `config` first and then from the `ZOOM_ACCOUNT_ID`,
 *   `ZOOM_CLIENT_ID`, and `ZOOM_CLIENT_SECRET` environment variables.
 * @returns A fully initialised `VideoMeetingsProvider` backed by Zoom.
 * @throws {Error} If neither an `accessToken` resolver nor full
 *   Server-to-Server OAuth credentials are available.
 */
export function createProvider(config: ZoomVideoMeetingsConfig = {}): VideoMeetingsProvider {
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
  const oauthUrl = config.oauthUrl ?? DEFAULT_OAUTH_URL
  const fetchImpl = config.fetch ?? fetch
  const now = config.now ?? Date.now
  const accessTokenResolver = config.accessToken

  const accountId = config.accountId ?? process.env.ZOOM_ACCOUNT_ID
  const clientId = config.clientId ?? process.env.ZOOM_CLIENT_ID
  const clientSecret = config.clientSecret ?? process.env.ZOOM_CLIENT_SECRET

  if (!accessTokenResolver) {
    if (!accountId || !clientId || !clientSecret) {
      throw new Error(
        'Zoom credentials are required. Provide config.accessToken, or set config.accountId/clientId/clientSecret (or ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET).',
      )
    }
  }

  /** Cached account-level access token (Server-to-Server OAuth). */
  let cachedToken: string | undefined
  /** Epoch millis after which the cached token must be refreshed. */
  let cachedTokenExpiresAtMs = 0

  /**
   * Fetches and caches an account-level access token using Server-to-Server
   * OAuth. Tokens are cached until 60 seconds before their reported expiry.
   *
   * @returns The cached or freshly-fetched access token.
   */
  async function fetchAccountToken(): Promise<string> {
    if (cachedToken && now() < cachedTokenExpiresAtMs) {
      return cachedToken
    }
    const url = `${oauthUrl}?grant_type=account_credentials&account_id=${encodeURIComponent(
      accountId as string,
    )}`
    // Build basic auth header without leaking the secret if request fails.
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const text = await response.text()
    let body: ZoomTokenResponse | null = null
    if (text.length > 0) {
      try {
        body = JSON.parse(text) as ZoomTokenResponse
      } catch (_error) {
        // Malformed JSON from the OAuth endpoint — leave body null so the
        // `!body` check below throws a descriptive error with the HTTP status.
        body = null
      }
    }

    if (!response.ok) {
      throw new Error(
        `Zoom OAuth token request failed (${response.status}): ${
          response.statusText || 'unknown error'
        }`,
      )
    }
    if (!body || typeof body.access_token !== 'string') {
      throw new Error('Zoom OAuth token response did not include an access_token.')
    }

    cachedToken = body.access_token
    const expiresInSec = typeof body.expires_in === 'number' ? body.expires_in : 3300
    cachedTokenExpiresAtMs = now() + Math.max(0, expiresInSec - 60) * 1000
    return cachedToken
  }

  /**
   * Resolves the bearer token for an outgoing API request. Prefers the
   * user-OAuth resolver when configured, otherwise uses the Server-to-Server
   * cache.
   *
   * @returns The bearer token string.
   */
  async function resolveAccessToken(): Promise<string> {
    if (accessTokenResolver) {
      return accessTokenResolver()
    }
    return fetchAccountToken()
  }

  /**
   * Performs an authenticated request against the Zoom API and returns the
   * parsed JSON body. Credentials are never included in thrown error
   * messages.
   *
   * @param path - The API path (relative to the base URL).
   * @param init - Optional `fetch` init overrides.
   * @returns The parsed JSON response (or `null` for empty `204` bodies).
   */
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await resolveAccessToken()
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    if (init.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await fetchImpl(`${baseUrl}${path}`, { ...init, headers })

    if (response.status === 204) {
      return null as T
    }

    const text = await response.text()
    let body: unknown = null
    if (text.length > 0) {
      try {
        body = JSON.parse(text)
      } catch (_error) {
        // Non-JSON response body — fall back to the raw text so the error
        // message below still surfaces the server's response verbatim.
        body = text
      }
    }

    if (!response.ok) {
      const message =
        (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
          ? body.message
          : undefined) ??
        (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : undefined) ??
        response.statusText ??
        'unknown error'
      throw new Error(`Zoom request failed (${response.status}): ${message}`)
    }

    return body as T
  }

  const provider: VideoMeetingsProvider = {
    async createMeeting(options: CreateMeetingOptions, userId = 'me'): Promise<Meeting> {
      const body = buildMeetingBody(options, true)
      const data = await request<ZoomMeetingResponse>(
        `/users/${encodeURIComponent(userId)}/meetings`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        },
      )
      return mapMeeting(data)
    },

    async getMeeting(meetingId: string): Promise<Meeting | null> {
      try {
        const data = await request<ZoomMeetingResponse>(
          `/meetings/${encodeURIComponent(meetingId)}`,
        )
        return mapMeeting(data)
      } catch (error) {
        if (error instanceof Error && /\(404\)/.test(error.message)) {
          return null
        }
        throw error
      }
    },

    async updateMeeting(meetingId: string, patch: UpdateMeetingOptions): Promise<Meeting> {
      const body = buildMeetingBody(patch, false)
      // Zoom's PATCH /meetings/:id returns 204 No Content. Re-fetch to
      // return the updated meeting.
      await request<unknown>(`/meetings/${encodeURIComponent(meetingId)}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      const data = await request<ZoomMeetingResponse>(`/meetings/${encodeURIComponent(meetingId)}`)
      return mapMeeting(data)
    },

    async deleteMeeting(meetingId: string): Promise<void> {
      try {
        await request<unknown>(`/meetings/${encodeURIComponent(meetingId)}`, {
          method: 'DELETE',
        })
      } catch (error) {
        if (error instanceof Error && /\(404\)/.test(error.message)) {
          return
        }
        throw error
      }
    },

    async listMeetings(userId: string, options: ListMeetingsOptions = {}): Promise<MeetingPage> {
      const params = new URLSearchParams()
      const type = toZoomListType(options.type)
      if (type) params.set('type', type)
      if (options.pageSize !== undefined) params.set('page_size', String(options.pageSize))
      if (options.pageToken !== undefined) params.set('next_page_token', options.pageToken)
      const qs = params.toString()
      const data = await request<ZoomMeetingListResponse>(
        `/users/${encodeURIComponent(userId)}/meetings${qs ? `?${qs}` : ''}`,
      )
      const meetings = (data.meetings ?? []).map(mapMeeting)
      const page: MeetingPage = { meetings }
      if (data.next_page_token !== undefined && data.next_page_token !== '') {
        page.nextPageToken = data.next_page_token
      }
      return page
    },
  }

  return provider
}
