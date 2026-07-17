/**
 * LiveKit implementation of the molecule {@link VideoRoomsProvider} interface.
 *
 * Wraps the LiveKit Server API (Twirp transport — `RoomServiceClient` and
 * `EgressClient` from `livekit-server-sdk`) and the `AccessToken` JWT
 * signer to provide room lifecycle, signed meeting tokens (HS256), and
 * egress (cloud recording) listing conforming to
 * `@molecule/api-video-rooms`.
 *
 * LiveKit is self-hostable (alongside LiveKit Cloud), making this the
 * recommended provider whenever operators need to keep media on their
 * own infrastructure.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'
import {
  AccessToken,
  EgressClient,
  EgressStatus,
  type RoomEgress,
  RoomServiceClient,
} from 'livekit-server-sdk'

import type {
  CreateMeetingTokenOptions,
  CreateRoomOptions,
  Recording,
  Room,
  RoomCreated,
  VideoRoomsProvider,
} from '@molecule/api-video-rooms'

import type {
  AccessTokenCtor,
  LiveKitEgressClient,
  LiveKitEgressInfo,
  LiveKitRoom,
  LiveKitRoomServiceClient,
  LiveKitVideoRoomsConfig,
} from './types.js'

const DEFAULT_TOKEN_TTL_SECONDS = 6 * 60 * 60

/**
 * Coerces a LiveKit timestamp (which may be `bigint`, `number`, or
 * `undefined`) into milliseconds suitable for `new Date(ms)`.
 *
 * LiveKit reports unix-seconds (sometimes as `bigint` because the proto
 * field is `int64`). Treats `0` as "unset" since the proto default is 0.
 *
 * @param value - The raw timestamp value.
 * @returns The timestamp in milliseconds, or `undefined` if unset.
 */
function toMillis(value: number | bigint | undefined): number | undefined {
  if (value === undefined) return undefined
  const numeric = typeof value === 'bigint' ? Number(value) : value
  if (!Number.isFinite(numeric) || numeric === 0) return undefined
  return numeric * 1000
}

/**
 * Coerces a LiveKit duration (`bigint` | `number` | `undefined`) into a
 * plain number of seconds. The LiveKit `FileInfo.duration` field is in
 * nanoseconds, but the molecule contract reports seconds — divide by
 * `1e9` when present.
 *
 * @param value - The raw duration in nanoseconds.
 * @returns Duration in seconds, or `undefined` if unset.
 */
function toSeconds(value: number | bigint | undefined): number | undefined {
  if (value === undefined) return undefined
  const numeric = typeof value === 'bigint' ? Number(value) : value
  if (!Number.isFinite(numeric) || numeric === 0) return undefined
  return numeric / 1e9
}

/**
 * Maps a LiveKit `Room` payload onto the normalised molecule {@link Room}.
 *
 * @param data - LiveKit room payload (as returned by `RoomServiceClient`).
 * @param wsUrl - The LiveKit websocket URL to expose as the joinable URL.
 * @returns Normalised molecule room.
 */
function mapRoom(data: LiveKitRoom, wsUrl: string): Room {
  const room: Room = {
    name: data.name,
    url: wsUrl,
  }

  if (typeof data.maxParticipants === 'number' && data.maxParticipants > 0) {
    room.maxParticipants = data.maxParticipants
  }

  if (typeof data.activeRecording === 'boolean') {
    room.recording = data.activeRecording
  }

  return room
}

/**
 * Normalises a LiveKit `EgressStatus` enum value onto the molecule
 * {@link Recording.status} enum.
 *
 * @param status - Numeric LiveKit `EgressStatus` value.
 * @returns Normalised molecule recording status.
 */
function mapRecordingStatus(status: number | undefined): Recording['status'] {
  switch (status) {
    case EgressStatus.EGRESS_STARTING:
    case EgressStatus.EGRESS_ACTIVE:
    case EgressStatus.EGRESS_ENDING:
      return 'processing'
    case EgressStatus.EGRESS_COMPLETE:
      return 'ready'
    case EgressStatus.EGRESS_FAILED:
    case EgressStatus.EGRESS_ABORTED:
    case EgressStatus.EGRESS_LIMIT_REACHED:
      return 'failed'
    default:
      return 'processing'
  }
}

/**
 * Maps a LiveKit egress payload onto the normalised molecule
 * {@link Recording}. The first entry of `fileResults` is treated as the
 * canonical download — egress jobs may produce multiple files but
 * molecule reports the primary one.
 *
 * @param data - LiveKit egress info.
 * @returns Normalised molecule recording.
 */
function mapRecording(data: LiveKitEgressInfo): Recording {
  const recording: Recording = {
    id: data.egressId,
    roomName: data.roomName,
  }

  recording.status = mapRecordingStatus(data.status)

  const startedAtMs = toMillis(data.startedAt)
  if (startedAtMs !== undefined) {
    recording.startedAt = new Date(startedAtMs)
  }

  const file = data.fileResults?.[0]
  if (file?.location) {
    recording.downloadUrl = file.location
  }
  const duration = toSeconds(file?.duration)
  if (duration !== undefined) {
    recording.duration = duration
  }

  return recording
}

/**
 * Normalises an explicit host or `LIVEKIT_URL` env value into the
 * `https://` form required by Twirp service clients and the `wss://`
 * form clients use to actually join.
 *
 * @param host - User-provided host (e.g. `https://...`, `wss://...`,
 *   `http://...`, or `ws://...`).
 * @returns A pair of `{ http, ws }` URLs derived from the same origin.
 */
function normaliseHost(host: string): { http: string; ws: string } {
  const trimmed = host.replace(/\/$/, '')
  let http: string
  let ws: string

  if (trimmed.startsWith('wss://')) {
    http = `https://${trimmed.slice('wss://'.length)}`
    ws = trimmed
  } else if (trimmed.startsWith('ws://')) {
    http = `http://${trimmed.slice('ws://'.length)}`
    ws = trimmed
  } else if (trimmed.startsWith('https://')) {
    http = trimmed
    ws = `wss://${trimmed.slice('https://'.length)}`
  } else if (trimmed.startsWith('http://')) {
    http = trimmed
    ws = `ws://${trimmed.slice('http://'.length)}`
  } else {
    http = `https://${trimmed}`
    ws = `wss://${trimmed}`
  }

  return { http, ws }
}

/**
 * Computes the unix-seconds TTL (relative offset, in seconds) that
 * `livekit-server-sdk`'s `AccessToken` expects for its `ttl` option,
 * given an absolute expiry `Date`. Returns `undefined` when no expiry
 * was provided, in which case the SDK's default of 6 hours applies.
 *
 * @param expiresAt - Optional absolute expiry.
 * @returns TTL in seconds, or `undefined`.
 */
function toTtlSeconds(expiresAt: Date | undefined): number | undefined {
  if (expiresAt === undefined) return undefined
  const ms = expiresAt.getTime() - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return 1
  return Math.floor(ms / 1000)
}

/**
 * Creates a LiveKit-backed {@link VideoRoomsProvider}.
 *
 * Self-hostable: pass a `host` of e.g. `https://livekit.example.com` or
 * set `LIVEKIT_URL` to the same value (or a `wss://` URL — the provider
 * rewrites the protocol for the HTTP/Twirp endpoints).
 *
 * The API secret is **never** included in any error thrown by this
 * provider — both the missing-secret error and SDK-error wrappers
 * scrub it out.
 *
 * @param config - LiveKit provider configuration. Falls back to the
 *   `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` env vars
 *   when the corresponding fields are omitted.
 * @returns A fully initialised `VideoRoomsProvider` backed by LiveKit.
 * @throws {Error} If host, API key, or API secret cannot be resolved.
 */
export function createProvider(config: LiveKitVideoRoomsConfig = {}): VideoRoomsProvider {
  const apiKey = config.apiKey ?? process.env.LIVEKIT_API_KEY
  const apiSecret = config.apiSecret ?? process.env.LIVEKIT_API_SECRET
  const rawHost = config.host ?? process.env.LIVEKIT_URL
  const defaultTokenTtl = config.defaultTokenTtl ?? DEFAULT_TOKEN_TTL_SECONDS

  if (!rawHost) {
    throw new Error(
      'LiveKit host is required. Set config.host or the LIVEKIT_URL environment variable.',
    )
  }
  if (!apiKey) {
    throw new Error(
      'LiveKit apiKey is required. Set config.apiKey or the LIVEKIT_API_KEY environment variable.',
    )
  }
  if (!apiSecret) {
    throw new Error(
      'LiveKit apiSecret is required. Set config.apiSecret or the LIVEKIT_API_SECRET environment variable.',
    )
  }

  // Locked-in non-undefined values for closure use after the early throws above.
  const resolvedApiKey: string = apiKey
  const resolvedApiSecret: string = apiSecret

  const { http: httpUrl, ws: wsUrl } = normaliseHost(rawHost)

  const accessTokenCtor: AccessTokenCtor =
    config.accessTokenCtor ?? (AccessToken as unknown as AccessTokenCtor)

  const roomService: LiveKitRoomServiceClient =
    config.roomServiceClient ??
    (new RoomServiceClient(
      httpUrl,
      resolvedApiKey,
      resolvedApiSecret,
    ) as unknown as LiveKitRoomServiceClient)

  const egress: LiveKitEgressClient =
    config.egressClient ??
    (new EgressClient(httpUrl, resolvedApiKey, resolvedApiSecret) as unknown as LiveKitEgressClient)

  const recordingEgress = config.recordingEgress

  /**
   * Resolves the configured auto-egress specification for a room, if any.
   * Returns the fixed `RoomEgress`, the result of the factory, or
   * `undefined` when no recording output has been configured on this bond.
   *
   * @param roomName - The room the egress would record.
   * @returns The `RoomEgress` to attach, or `undefined` when unconfigured.
   */
  function resolveRecordingEgress(roomName: string): RoomEgress | undefined {
    if (recordingEgress === undefined) return undefined
    return typeof recordingEgress === 'function' ? recordingEgress(roomName) : recordingEgress
  }

  /**
   * Wraps a thrown error in a provider-prefixed `Error` whose message is
   * scrubbed of the LiveKit API secret.
   *
   * @param operation - Short label of the failing operation.
   * @param error - The underlying error.
   * @returns A redacted Error with provider context.
   */
  function redactError(operation: string, error: unknown): Error {
    const raw = error instanceof Error ? error.message : String(error)
    const scrubbed = raw.split(resolvedApiSecret).join('[redacted]')
    const wrapped = new Error(`LiveKit ${operation} failed: ${scrubbed}`)
    if (error instanceof Error && error.stack) {
      wrapped.stack = error.stack
    }
    return wrapped
  }

  /**
   * Generates a fresh meeting token for `roomName` with the given
   * options. All tokens get publish + subscribe; owners additionally get
   * roomAdmin + canUpdateOwnMetadata.
   *
   * @param roomName - The room the token is scoped to.
   * @param options - Token options.
   * @returns The signed JWT.
   */
  async function issueToken(
    roomName: string,
    options: CreateMeetingTokenOptions = {},
  ): Promise<string> {
    const ttl = toTtlSeconds(options.expiresAt) ?? defaultTokenTtl

    const tokenOptions: { ttl: number; identity?: string; name?: string } = { ttl }
    if (options.userName !== undefined) {
      tokenOptions.identity = options.userName
      tokenOptions.name = options.userName
    }

    const token = new accessTokenCtor(resolvedApiKey, resolvedApiSecret, tokenOptions)
    const isOwner = options.isOwner === true
    token.addGrant({
      room: roomName,
      roomJoin: true,
      roomAdmin: isOwner,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: isOwner,
    })

    return token.toJwt()
  }

  const provider: VideoRoomsProvider = {
    async createRoom(options: CreateRoomOptions): Promise<RoomCreated> {
      // Privacy: LiveKit is *always* token-gated — every join needs a token
      // from createMeetingToken(), and Room.url is the server's wss://
      // endpoint, not a click-to-join link. There is no URL-joinable /
      // token-free mode, so a `public` room cannot be honoured. Fail loudly
      // at creation rather than return a room falsely labelled `public`.
      if (options.privacy === 'public') {
        throw new Error(
          'LiveKit does not support public (URL-joinable) rooms: every join ' +
            'requires a meeting token from createMeetingToken(). Use ' +
            "privacy: 'private' (the default enforced by this bond) or omit it.",
        )
      }

      const name = options.name ?? `room-${Date.now()}-${Math.floor(Math.random() * 1e6)}`

      const createOptions: {
        name: string
        emptyTimeout?: number
        maxParticipants?: number
        egress?: RoomEgress
      } = { name }

      if (options.maxParticipants !== undefined) {
        createOptions.maxParticipants = options.maxParticipants
      }

      const ttl = toTtlSeconds(options.expiresAt)
      if (ttl !== undefined) {
        createOptions.emptyTimeout = ttl
      }

      // Recording: LiveKit records via Egress, which requires a storage
      // output that the core `recording: boolean` flag does not carry. When
      // recording is requested we attach the operator-configured auto-egress
      // spec so LiveKit really starts a room-composite egress once the room
      // is active; without it we throw rather than pretend recording is on.
      let recordingEnabled = false
      if (options.recording === true) {
        const egressSpec = resolveRecordingEgress(name)
        if (egressSpec === undefined) {
          throw new Error(
            'LiveKit recording was requested (recording: true) but no egress ' +
              'output is configured. Set config.recordingEgress to a LiveKit ' +
              'RoomEgress with a storage destination (S3 / GCP / Azure / AliOSS ' +
              'file output, or a stream/segment output). LiveKit cannot record ' +
              'without a storage output.',
          )
        }
        createOptions.egress = egressSpec
        recordingEnabled = true
      }

      let raw: LiveKitRoom
      try {
        raw = await roomService.createRoom(createOptions)
      } catch (error) {
        throw redactError('createRoom', error)
      }

      const room = mapRoom(raw, wsUrl)
      // Every LiveKit room is token-gated — report the true privacy state.
      room.privacy = 'private'
      if (options.expiresAt !== undefined) {
        room.expiresAt = options.expiresAt
      }
      // Recording is enabled for the room even before the first participant
      // makes the egress active, so report it as enabled once wired.
      if (recordingEnabled) {
        room.recording = true
      }

      const result: RoomCreated = { ...room }
      try {
        result.token = await issueToken(name, {
          isOwner: true,
          expiresAt: options.expiresAt,
        })
      } catch (error) {
        throw redactError('createMeetingToken', error)
      }
      return result
    },

    async deleteRoom(name: string): Promise<void> {
      try {
        await roomService.deleteRoom(name)
      } catch (error) {
        if (isNotFoundError(error)) return
        throw redactError('deleteRoom', error)
      }
    },

    async getRoom(name: string): Promise<Room | null> {
      let rooms: LiveKitRoom[]
      try {
        rooms = await roomService.listRooms([name])
      } catch (error) {
        throw redactError('getRoom', error)
      }
      const match = rooms.find((r) => r.name === name)
      return match ? mapRoom(match, wsUrl) : null
    },

    async createMeetingToken(
      roomName: string,
      options?: CreateMeetingTokenOptions,
    ): Promise<string> {
      try {
        return await issueToken(roomName, options)
      } catch (error) {
        throw redactError('createMeetingToken', error)
      }
    },

    async listRecordings(roomName: string): Promise<Recording[]> {
      let rows: LiveKitEgressInfo[]
      try {
        rows = await egress.listEgress({ roomName })
      } catch (error) {
        throw redactError('listRecordings', error)
      }
      return rows.map(mapRecording)
    },
  }

  return provider
}

/**
 * Detects whether a thrown LiveKit error represents a "room does not
 * exist" (404 / not_found / NotFound) condition. Used to make
 * `deleteRoom` idempotent.
 *
 * @param error - The thrown error.
 * @returns `true` when the error indicates a missing room.
 */
function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  if (message.includes('not_found')) return true
  if (message.includes('not found')) return true
  if (message.includes('does not exist')) return true
  if (/\b404\b/.test(error.message)) return true
  // TwirpError exposes a `code` property of `'not_found'` for missing
  // resources. Check it without coupling to the concrete type.
  const code = (error as Error & { code?: unknown }).code
  if (typeof code === 'string' && code.toLowerCase() === 'not_found') return true
  return false
}
