/**
 * Daily.co implementation of the molecule {@link VideoRoomsProvider} interface.
 *
 * Wraps the Daily.co REST API (`https://api.daily.co/v1`) to provide
 * room lifecycle, meeting token issuance, and cloud recording listing
 * conforming to `@molecule/api-video-rooms`.
 *
 * @module
 */

import type {
  CreateMeetingTokenOptions,
  CreateRoomOptions,
  Recording,
  Room,
  RoomCreated,
  RoomPrivacy,
  VideoRoomsProvider,
} from '@molecule/api-video-rooms'

import type { DailyCoVideoRoomsConfig } from './types.js'

const DEFAULT_BASE_URL = 'https://api.daily.co/v1'

interface DailyCoRoomConfig {
  exp?: number
  max_participants?: number
  enable_recording?: string
}

interface DailyCoRoomResponse {
  id?: string
  name: string
  url: string
  privacy?: RoomPrivacy
  config?: DailyCoRoomConfig
}

interface DailyCoMeetingTokenResponse {
  token: string
}

interface DailyCoRecording {
  id: string
  room_name: string
  start_ts?: number
  duration?: number
  status?: string
  download_link?: string
}

interface DailyCoRecordingsResponse {
  data?: DailyCoRecording[]
  total_count?: number
}

/**
 * Maps a Daily.co room response onto the normalised molecule {@link Room}.
 *
 * @param data - The Daily.co room response payload.
 * @returns The normalised room.
 */
function mapRoom(data: DailyCoRoomResponse): Room {
  const room: Room = {
    name: data.name,
    url: data.url,
  }

  if (data.privacy) {
    room.privacy = data.privacy
  }

  if (data.config?.exp !== undefined) {
    room.expiresAt = new Date(data.config.exp * 1000)
  }

  if (data.config?.max_participants !== undefined) {
    room.maxParticipants = data.config.max_participants
  }

  if (data.config?.enable_recording !== undefined) {
    room.recording = data.config.enable_recording !== 'off'
  }

  return room
}

/**
 * Maps a Daily.co recording row onto the normalised molecule {@link Recording}.
 *
 * @param data - The Daily.co recording response row.
 * @returns The normalised recording.
 */
function mapRecording(data: DailyCoRecording): Recording {
  const recording: Recording = {
    id: data.id,
    roomName: data.room_name,
  }

  if (data.start_ts !== undefined) {
    recording.startedAt = new Date(data.start_ts * 1000)
  }

  if (data.duration !== undefined) {
    recording.duration = data.duration
  }

  if (data.status !== undefined) {
    recording.status = mapRecordingStatus(data.status)
  }

  if (data.download_link !== undefined) {
    recording.downloadUrl = data.download_link
  }

  return recording
}

/**
 * Normalises Daily.co recording status strings onto molecule's
 * {@link Recording.status} enum.
 *
 * @param status - The raw Daily.co status string.
 * @returns The normalised molecule recording status.
 */
function mapRecordingStatus(status: string): Recording['status'] {
  switch (status) {
    case 'finished':
    case 'ready':
      return 'ready'
    case 'in-progress':
    case 'processing':
      return 'processing'
    case 'failed':
    case 'canceled':
      return 'failed'
    case 'deleted':
      return 'deleted'
    default:
      return 'processing'
  }
}

/**
 * Converts an optional `Date` to a Daily.co unix-seconds expiry, or
 * `undefined` if no date is provided.
 *
 * @param date - The optional date.
 * @returns Unix-seconds timestamp, or `undefined`.
 */
function toUnixSeconds(date: Date | undefined): number | undefined {
  return date === undefined ? undefined : Math.floor(date.getTime() / 1000)
}

/**
 * Creates a Daily.co-backed {@link VideoRoomsProvider}.
 *
 * @param config - Daily.co provider configuration. Falls back to the
 *   `DAILY_CO_API_KEY` environment variable when no `apiKey` is given.
 * @returns A fully initialised `VideoRoomsProvider` backed by Daily.co.
 * @throws {Error} If no API key is available.
 */
export function createProvider(config: DailyCoVideoRoomsConfig = {}): VideoRoomsProvider {
  const apiKey = config.apiKey ?? process.env.DAILY_CO_API_KEY
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
  const fetchImpl = config.fetch ?? fetch

  if (!apiKey) {
    throw new Error(
      'Daily.co apiKey is required. Set config.apiKey or the DAILY_CO_API_KEY environment variable.',
    )
  }

  /**
   * Performs an authenticated request against the Daily.co REST API and
   * returns the parsed JSON body. The API key is never included in
   * thrown error messages.
   *
   * @param path - The API path (relative to the base URL).
   * @param init - Optional `fetch` init overrides.
   * @returns The parsed JSON response (or `null` for empty `204` bodies).
   */
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${apiKey}`)
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
        // Non-JSON body — fall back to the raw text string; parse failure is not actionable here.
        body = text
      }
    }

    if (!response.ok) {
      const message =
        (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
          ? body.error
          : undefined) ??
        (body && typeof body === 'object' && 'info' in body && typeof body.info === 'string'
          ? body.info
          : undefined) ??
        response.statusText ??
        'unknown error'
      throw new Error(`Daily.co request failed (${response.status}): ${message}`)
    }

    return body as T
  }

  const provider: VideoRoomsProvider = {
    async createRoom(options: CreateRoomOptions): Promise<RoomCreated> {
      const properties: Record<string, unknown> = {}
      const exp = toUnixSeconds(options.expiresAt)
      if (exp !== undefined) {
        properties.exp = exp
      }
      if (options.maxParticipants !== undefined) {
        properties.max_participants = options.maxParticipants
      }
      if (options.recording !== undefined) {
        properties.enable_recording = options.recording ? 'cloud' : 'off'
      }

      const body: Record<string, unknown> = {}
      if (options.name !== undefined) {
        body.name = options.name
      }
      if (options.privacy !== undefined) {
        body.privacy = options.privacy
      }
      if (Object.keys(properties).length > 0) {
        body.properties = properties
      }

      const data = await request<DailyCoRoomResponse>('/rooms', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      return mapRoom(data)
    },

    async deleteRoom(name: string): Promise<void> {
      try {
        await request<unknown>(`/rooms/${encodeURIComponent(name)}`, { method: 'DELETE' })
      } catch (error) {
        if (error instanceof Error && /\(404\)/.test(error.message)) {
          return
        }
        throw error
      }
    },

    async getRoom(name: string): Promise<Room | null> {
      try {
        const data = await request<DailyCoRoomResponse>(`/rooms/${encodeURIComponent(name)}`)
        return mapRoom(data)
      } catch (error) {
        if (error instanceof Error && /\(404\)/.test(error.message)) {
          return null
        }
        throw error
      }
    },

    async createMeetingToken(
      roomName: string,
      options: CreateMeetingTokenOptions = {},
    ): Promise<string> {
      const properties: Record<string, unknown> = { room_name: roomName }
      if (options.isOwner !== undefined) {
        properties.is_owner = options.isOwner
      }
      if (options.userName !== undefined) {
        properties.user_name = options.userName
      }
      const exp = toUnixSeconds(options.expiresAt)
      if (exp !== undefined) {
        properties.exp = exp
      }

      const data = await request<DailyCoMeetingTokenResponse>('/meeting-tokens', {
        method: 'POST',
        body: JSON.stringify({ properties }),
      })

      return data.token
    },

    async listRecordings(roomName: string): Promise<Recording[]> {
      const data = await request<DailyCoRecordingsResponse>(
        `/recordings?room_name=${encodeURIComponent(roomName)}`,
      )
      const rows = data.data ?? []
      return rows.map(mapRecording)
    },
  }

  return provider
}
