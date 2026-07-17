/**
 * LiveKit video rooms provider configuration types.
 *
 * @module
 */

import type { AccessToken as AccessTokenClass, RoomEgress } from 'livekit-server-sdk'

/**
 * Constructor for `livekit-server-sdk`'s `AccessToken` class. Exposed so
 * tests can inject a fake builder without spinning up the real `jose`
 * signer.
 */
export type AccessTokenCtor = new (
  apiKey?: string,
  apiSecret?: string,
  options?: ConstructorParameters<typeof AccessTokenClass>[2],
) => AccessTokenClass

/**
 * Minimal `RoomServiceClient` surface used by the provider. Tests inject
 * a stub here to avoid HTTP traffic. The real
 * `livekit-server-sdk.RoomServiceClient` satisfies this shape.
 */
export interface LiveKitRoomServiceClient {
  /** Creates a new LiveKit room. */
  createRoom(options: {
    name: string
    emptyTimeout?: number
    departureTimeout?: number
    maxParticipants?: number
    metadata?: string
    /**
     * Auto-egress specification. When set, LiveKit automatically starts a
     * room-composite (or participant/track) egress once the room becomes
     * active — this is how the bond wires `CreateRoomOptions.recording`.
     */
    egress?: RoomEgress
  }): Promise<LiveKitRoom>

  /** Lists active rooms, optionally filtered by name. */
  listRooms(names?: string[]): Promise<LiveKitRoom[]>

  /** Deletes a room by name. */
  deleteRoom(room: string): Promise<void>
}

/**
 * Minimal `EgressClient` surface used by the provider for listing
 * recordings.
 */
export interface LiveKitEgressClient {
  /** Lists egress (recording) jobs, optionally filtered by room. */
  listEgress(options?: { roomName?: string }): Promise<LiveKitEgressInfo[]>
}

/**
 * Minimal LiveKit `Room` shape consumed by the provider. The real
 * protobuf class exposes additional fields we don't depend on.
 */
export interface LiveKitRoom {
  /** Room name (stable identifier). */
  name: string

  /** Room sid (unique per-instance id). */
  sid?: string

  /** Maximum simultaneous participants. */
  maxParticipants?: number

  /** Empty-room TTL in seconds. */
  emptyTimeout?: number

  /** Departure-room TTL in seconds. */
  departureTimeout?: number

  /** Provider-side opaque metadata blob. */
  metadata?: string

  /** Unix-seconds creation timestamp (the protobuf field is `bigint`). */
  creationTime?: number | bigint

  /** Whether a recording is currently active on the room. */
  activeRecording?: boolean
}

/**
 * Minimal LiveKit egress (recording job) shape. Status is the numeric
 * `EgressStatus` enum value from `@livekit/protocol`.
 */
export interface LiveKitEgressInfo {
  /** Egress identifier. */
  egressId: string

  /** Name of the room the egress belongs to. */
  roomName: string

  /** Numeric `EgressStatus` enum (0=starting … 6=limit_reached). */
  status?: number

  /** Unix-seconds (or bigint) start time. */
  startedAt?: number | bigint

  /** Unix-seconds (or bigint) end time. */
  endedAt?: number | bigint

  /** Recorded file results, when present. */
  fileResults?: Array<{
    location?: string
    duration?: number | bigint
  }>
}

/**
 * Configuration for the LiveKit video rooms provider.
 */
export interface LiveKitVideoRoomsConfig {
  /**
   * LiveKit host (including protocol), e.g.
   * `https://my-project.livekit.cloud` or `https://livekit.example.com`.
   * Defaults to `process.env.LIVEKIT_URL` (which may use `wss://` — the
   * provider rewrites it to `https://` for HTTP/Twirp calls).
   */
  host?: string

  /**
   * LiveKit API key. Defaults to `process.env.LIVEKIT_API_KEY`.
   */
  apiKey?: string

  /**
   * LiveKit API secret. Defaults to `process.env.LIVEKIT_API_SECRET`.
   * Used to sign JWT meeting tokens via HS256.
   */
  apiSecret?: string

  /**
   * Optional default token TTL in seconds. Used when
   * `createMeetingToken()` is called without an `expiresAt`. Defaults to
   * `21600` (6 hours), matching the `livekit-server-sdk` default.
   */
  defaultTokenTtl?: number

  /**
   * Auto-egress specification used to satisfy `createRoom({ recording:
   * true })`. LiveKit records via Egress, which **requires** a storage
   * destination (S3 / GCP / Azure / AliOSS via `EncodedFileOutput`, or a
   * stream/segment output) — a destination the core `recording: boolean`
   * flag does not carry. Supply the LiveKit `RoomEgress` (with your
   * storage output) here, either as a fixed object or a factory that
   * receives the room name and returns a per-room `RoomEgress`. When it is
   * set, `createRoom({ recording: true })` attaches it to the room so
   * LiveKit auto-starts a room-composite egress once the room is active.
   *
   * When this is **not** configured, `createRoom({ recording: true })`
   * throws rather than silently returning a room with no recording — LiveKit
   * cannot record without a storage output.
   */
  recordingEgress?: RoomEgress | ((roomName: string) => RoomEgress)

  /**
   * Optional pre-built `RoomServiceClient` (or compatible stub). Tests
   * inject a stub here. When omitted, the provider lazily constructs a
   * real `RoomServiceClient` from the SDK on first use.
   */
  roomServiceClient?: LiveKitRoomServiceClient

  /**
   * Optional pre-built `EgressClient` (or compatible stub). Tests inject
   * a stub here. When omitted, the provider lazily constructs a real
   * `EgressClient` from the SDK on first use.
   */
  egressClient?: LiveKitEgressClient

  /**
   * Optional `AccessToken` constructor override. Tests inject a fake
   * builder to avoid the real `jose` HS256 signer. Defaults to the
   * `AccessToken` class exported by `livekit-server-sdk`.
   */
  accessTokenCtor?: AccessTokenCtor
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /** LiveKit-specific environment variable declarations. */
    export interface ProcessEnv {
      LIVEKIT_URL?: string
      LIVEKIT_API_KEY?: string
      LIVEKIT_API_SECRET?: string
    }
  }
}
