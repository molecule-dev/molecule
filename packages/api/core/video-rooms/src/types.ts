/**
 * Video rooms core types for molecule.dev.
 *
 * Defines the standard interfaces for real-time video room providers
 * (Daily.co, LiveKit, Twilio Video, Agora, etc.).
 *
 * @module
 */

/**
 * Privacy level for a video room.
 *
 * - `public` — anyone with the room URL can join.
 * - `private` — joiners must present a meeting token issued by
 *   {@link VideoRoomsProvider.createMeetingToken}.
 */
export type RoomPrivacy = 'public' | 'private'

/**
 * Options for creating a new video room.
 */
export interface CreateRoomOptions {
  /** Room name. If omitted, the provider may auto-generate a unique name. */
  name?: string

  /** When the room should expire and stop accepting joins. */
  expiresAt?: Date

  /** Maximum simultaneous participants (provider-dependent cap may apply). */
  maxParticipants?: number

  /** Whether cloud recording should be enabled for this room. */
  recording?: boolean

  /** Visibility/privacy of the room. Defaults to `public` when omitted. */
  privacy?: RoomPrivacy
}

/**
 * A normalised description of an existing room as returned by a provider.
 */
export interface Room {
  /** Provider-stable room name / identifier. */
  name: string

  /** Joinable URL for the room. */
  url: string

  /** When the room expires, if a TTL is configured. */
  expiresAt?: Date

  /** Maximum simultaneous participants, if configured. */
  maxParticipants?: number

  /** Whether cloud recording is enabled on this room. */
  recording?: boolean

  /** Visibility/privacy of the room. */
  privacy?: RoomPrivacy
}

/**
 * Result of creating a new video room.
 *
 * Extends {@link Room} with an optional pre-issued owner meeting token so
 * callers can hand a single payload to clients without a follow-up call.
 */
export interface RoomCreated extends Room {
  /** Optional meeting token for the room creator (owner privileges). */
  token?: string
}

/**
 * Options for issuing a meeting token (signed join credential).
 */
export interface CreateMeetingTokenOptions {
  /** Whether the token grants owner / moderator privileges. */
  isOwner?: boolean

  /** Display name to use for the participant when joining the room. */
  userName?: string

  /** Token expiry. After this point the token cannot be used to join. */
  expiresAt?: Date
}

/**
 * A normalised description of a cloud recording produced by a room.
 */
export interface Recording {
  /** Provider-stable recording identifier. */
  id: string

  /** Name of the room the recording belongs to. */
  roomName: string

  /** When the recording started. */
  startedAt?: Date

  /** Recording duration in seconds, when known. */
  duration?: number

  /** Provider's reported processing/availability status. */
  status?: 'processing' | 'ready' | 'failed' | 'deleted'

  /** Time-limited download URL for the recording, when available. */
  downloadUrl?: string
}

/**
 * Video rooms provider interface.
 *
 * All video-rooms providers must implement this interface to provide a
 * normalised surface for room lifecycle, signed join tokens and cloud
 * recordings.
 */
export interface VideoRoomsProvider {
  /**
   * Creates a new video room.
   *
   * @param options - Room creation options.
   * @returns The created room, including its joinable URL.
   */
  createRoom(options: CreateRoomOptions): Promise<RoomCreated>

  /**
   * Deletes an existing room by name. Idempotent: deleting a non-existent
   * room must not throw.
   *
   * @param name - The room name / identifier.
   */
  deleteRoom(name: string): Promise<void>

  /**
   * Retrieves an existing room by name.
   *
   * @param name - The room name / identifier.
   * @returns The room if it exists, otherwise `null`.
   */
  getRoom(name: string): Promise<Room | null>

  /**
   * Issues a signed meeting token (join credential) for a room.
   *
   * @param roomName - The room the token is scoped to.
   * @param options - Token options (owner flag, display name, expiry).
   * @returns The signed token string.
   */
  createMeetingToken(roomName: string, options?: CreateMeetingTokenOptions): Promise<string>

  /**
   * Lists cloud recordings produced by a room.
   *
   * @param roomName - The room to list recordings for.
   * @returns The list of recordings, possibly empty.
   */
  listRecordings(roomName: string): Promise<Recording[]>
}
