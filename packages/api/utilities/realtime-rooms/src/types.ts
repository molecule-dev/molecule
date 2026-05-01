/**
 * Realtime-rooms type definitions.
 *
 * A higher-level abstraction over `@molecule/api-realtime`: named pub/sub
 * rooms with persisted membership, capacity enforcement, optional
 * join-codes, and role-based authorisation. Designed to fix the IDOR
 * pattern flagged in flagship apps (quiz-platform live quizzes,
 * virtual-classroom rooms) where any authenticated user could subscribe
 * to and broadcast on any channel.
 *
 * Persistence is via the abstract `@molecule/api-database` DataStore —
 * no raw SQL in handler-callable code. Schema lives in
 * `__setup__/realtime_rooms.sql`.
 *
 * @module
 */

/**
 * Role a member holds within a room.
 *
 * - `host` — created the room, full control (close, kick, broadcast).
 * - `guest` — joined the room, may broadcast iff the host allows it.
 */
export type RoomRole = 'host' | 'guest'

/**
 * A persisted realtime room.
 *
 * `kind` is an opaque app-level discriminator (e.g. `'quiz-session'`,
 * `'virtual-classroom'`) so a single rooms table can serve multiple
 * features without collision.
 */
export interface Room {
  /** Unique room identifier. */
  id: string
  /** App-level discriminator, e.g. `'quiz-session'`. */
  kind: string
  /** User id of the room host (creator). */
  ownerId: string
  /** Maximum number of concurrent members. `undefined` means uncapped. */
  capacity?: number
  /** Optional shared secret required to join private rooms. */
  joinCode?: string
  /** When `false`, joiners must supply a matching {@link Room.joinCode}. */
  isPublic: boolean
  /** Creation timestamp. */
  createdAt: Date
}

/**
 * A persisted member of a room.
 */
export interface RoomMember {
  /** The room this membership belongs to. */
  roomId: string
  /** The user holding the membership. */
  userId: string
  /** The user's role within the room. */
  role: RoomRole
  /** When the user joined. */
  joinedAt: Date
}

/**
 * An event broadcast to all subscribers of a room.
 *
 * `kind` is the event name (e.g. `'question-asked'`, `'answer-revealed'`)
 * and `payload` is the arbitrary serialisable body.
 */
export interface RoomEvent {
  /** The room this event was broadcast on. */
  roomId: string
  /** Event name / discriminator. */
  kind: string
  /** Event payload. Must be JSON-serialisable. */
  payload: unknown
  /** Server-side broadcast timestamp. */
  sentAt: Date
}

/**
 * Options for {@link createRoom}.
 */
export interface CreateRoomOptions {
  /** App-level discriminator. */
  kind: string
  /** User id that will be recorded as the host. */
  ownerId: string
  /** Maximum concurrent members (host counts). Optional. */
  capacity?: number
  /** Shared secret required to join. When supplied, `isPublic` is forced `false`. */
  joinCode?: string
  /** Whether non-invited users may join freely. Defaults to `true`. */
  isPublic?: boolean
  /**
   * Optional pre-generated room id. When omitted, a new id is minted by
   * the underlying DataStore.
   */
  id?: string
}

/**
 * Options for {@link broadcast}.
 */
export interface BroadcastOptions {
  /** Event name / discriminator. */
  kind: string
  /** Event payload. */
  payload: unknown
  /** Optional override for the broadcast timestamp. Defaults to `new Date()`. */
  sentAt?: Date
}

/**
 * Subscription handler receiving every broadcast on a room.
 *
 * @param event - The {@link RoomEvent} that was broadcast.
 */
export type RoomEventHandler = (event: RoomEvent) => void | Promise<void>

/**
 * Function returned by {@link subscribe} that removes the subscription
 * when invoked. Implementations should be idempotent.
 */
export type Unsubscribe = () => void
