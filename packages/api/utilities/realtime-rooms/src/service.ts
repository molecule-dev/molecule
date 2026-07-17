/**
 * Realtime-rooms persistence + lifecycle service.
 *
 * Combines abstract DataStore reads/writes (no raw SQL in handler-callable
 * code) with the bonded `realtime` provider's broadcast/subscribe transport
 * to deliver authenticated, capacity-bounded, role-aware rooms.
 *
 * All authorisation flows through {@link assertCanAct} — handlers MUST
 * call it before reading, broadcasting, or mutating room state, otherwise
 * any authenticated user can act on any room (the IDOR pattern flagged
 * in flagship apps).
 *
 * @module
 */

import {
  count as dbCount,
  create as dbCreate,
  deleteMany as dbDeleteMany,
  findMany as dbFindMany,
  findOne as dbFindOne,
  type WhereCondition,
} from '@molecule/api-database'
import {
  broadcast as realtimeBroadcast,
  onMessage as realtimeOnMessage,
} from '@molecule/api-realtime'

import {
  InvalidJoinCodeError,
  RoomCapacityExceededError,
  RoomNotFoundError,
  UnauthorizedRoomActionError,
} from './errors.js'
import type {
  BroadcastOptions,
  CreateRoomOptions,
  Room,
  RoomEvent,
  RoomEventHandler,
  RoomMember,
  RoomRole,
  Unsubscribe,
} from './types.js'

const ROOMS_TABLE = 'realtime_rooms'
const MEMBERS_TABLE = 'realtime_room_members'

/**
 * Database row shape for {@link ROOMS_TABLE}.
 */
interface RoomRow {
  id: string
  kind: string
  owner_id: string
  capacity: number | null
  join_code: string | null
  is_public: boolean
  created_at: string | Date
}

/**
 * Database row shape for {@link MEMBERS_TABLE}.
 */
interface MemberRow {
  room_id: string
  user_id: string
  role: RoomRole
  joined_at: string | Date
}

/**
 * Maps a {@link RoomRow} to the public {@link Room} shape.
 *
 * @param row - DataStore row.
 * @returns Normalised room.
 */
const toRoom = (row: RoomRow): Room => ({
  id: row.id,
  kind: row.kind,
  ownerId: row.owner_id,
  capacity: row.capacity ?? undefined,
  joinCode: row.join_code ?? undefined,
  isPublic: Boolean(row.is_public),
  createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
})

/**
 * Maps a {@link MemberRow} to the public {@link RoomMember} shape.
 *
 * @param row - DataStore row.
 * @returns Normalised member.
 */
const toMember = (row: MemberRow): RoomMember => ({
  roomId: row.room_id,
  userId: row.user_id,
  role: row.role,
  joinedAt: row.joined_at instanceof Date ? row.joined_at : new Date(row.joined_at),
})

/**
 * Realtime channel identifier for a given room. Apps subscribing to the
 * underlying transport directly should use this same convention so the
 * abstraction layers up cleanly.
 *
 * @param roomId - Room identifier.
 * @returns Stable channel name.
 */
export const channelFor = (roomId: string): string => `realtime-rooms:${roomId}`

/**
 * Loads a room by id or throws {@link RoomNotFoundError}.
 *
 * @param roomId - Room identifier.
 * @returns The persisted room.
 */
const loadRoom = async (roomId: string): Promise<Room> => {
  const row = await dbFindOne<RoomRow>(ROOMS_TABLE, [{ field: 'id', operator: '=', value: roomId }])
  if (!row) throw new RoomNotFoundError(roomId)
  return toRoom(row)
}

/**
 * Creates a new room and registers the owner as the host member.
 *
 * Capacity, join-code, and public/private invariants are enforced here
 * (a join-code forces `isPublic=false`).
 *
 * @param options - Creation parameters.
 * @returns The persisted room.
 */
export const createRoom = async (options: CreateRoomOptions): Promise<Room> => {
  if (options.capacity !== undefined && options.capacity < 1) {
    throw new Error(`Room capacity must be >= 1, got ${options.capacity}`)
  }

  const now = new Date()
  const isPublic = options.joinCode ? false : (options.isPublic ?? true)

  const insert: Record<string, unknown> = {
    kind: options.kind,
    owner_id: options.ownerId,
    capacity: options.capacity ?? null,
    join_code: options.joinCode ?? null,
    is_public: isPublic,
    created_at: now,
  }
  if (options.id) insert.id = options.id

  const result = await dbCreate<RoomRow>(ROOMS_TABLE, insert)

  // DataStore.create returns { data, affected }. Most providers populate
  // `data` with the inserted row; we accept either that or a refetch by
  // the supplied id.
  let row: RoomRow
  if (result.data) {
    row = result.data
  } else if (options.id) {
    const refetched = await dbFindOne<RoomRow>(ROOMS_TABLE, [
      { field: 'id', operator: '=', value: options.id },
    ])
    if (!refetched) {
      throw new Error(`createRoom: insert succeeded but row ${options.id} not found`)
    }
    row = refetched
  } else {
    throw new Error('createRoom: DataStore did not return inserted row and no `id` was supplied')
  }

  // Auto-register the owner as host. We don't go through joinRoom() here
  // because capacity / join-code checks don't apply to the creator.
  await dbCreate(MEMBERS_TABLE, {
    room_id: row.id,
    user_id: options.ownerId,
    role: 'host' satisfies RoomRole,
    joined_at: now,
  })

  return toRoom(row)
}

/**
 * Closes a room — deletes membership rows then the room itself.
 *
 * Subscribers should observe a final event of their choosing (callers
 * commonly broadcast `'room-closed'` via {@link broadcast} immediately
 * before invoking this).
 *
 * @param roomId - The room to close.
 */
export const closeRoom = async (roomId: string): Promise<void> => {
  await dbDeleteMany(MEMBERS_TABLE, [{ field: 'room_id', operator: '=', value: roomId }])
  await dbDeleteMany(ROOMS_TABLE, [{ field: 'id', operator: '=', value: roomId }])
}

/**
 * Adds a user to a room as a `guest`.
 *
 * Validates capacity and join-code. Re-joining is idempotent — a user
 * already in the room receives their existing membership without
 * incrementing the count.
 *
 * @param roomId - Room to join.
 * @param userId - User joining.
 * @param joinCode - Required when the room has a configured `joinCode`.
 * @returns The user's membership row.
 */
export const joinRoom = async (
  roomId: string,
  userId: string,
  joinCode?: string,
): Promise<RoomMember> => {
  const room = await loadRoom(roomId)

  if (room.joinCode && room.joinCode !== joinCode) {
    throw new InvalidJoinCodeError(roomId)
  }

  const existing = await dbFindOne<MemberRow>(MEMBERS_TABLE, [
    { field: 'room_id', operator: '=', value: roomId },
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing) return toMember(existing)

  if (room.capacity !== undefined) {
    const current = await dbCount(MEMBERS_TABLE, [
      { field: 'room_id', operator: '=', value: roomId },
    ])
    if (current >= room.capacity) {
      throw new RoomCapacityExceededError(roomId, room.capacity)
    }
  }

  const joinedAt = new Date()
  await dbCreate(MEMBERS_TABLE, {
    room_id: roomId,
    user_id: userId,
    role: 'guest' satisfies RoomRole,
    joined_at: joinedAt,
  })
  return { roomId, userId, role: 'guest', joinedAt }
}

/**
 * Removes a user from a room. Idempotent — silently succeeds if the
 * user is not a member.
 *
 * @param roomId - Room to leave.
 * @param userId - User leaving.
 */
export const leaveRoom = async (roomId: string, userId: string): Promise<void> => {
  await dbDeleteMany(MEMBERS_TABLE, [
    { field: 'room_id', operator: '=', value: roomId },
    { field: 'user_id', operator: '=', value: userId },
  ])
}

/**
 * Lists all current members of a room.
 *
 * Note: callers that need to enforce visibility (only members can list
 * other members) should `await assertCanAct(roomId, viewerUserId)` first.
 *
 * @param roomId - Room to list.
 * @returns Members ordered by `joined_at` ascending.
 */
export const listMembers = async (roomId: string): Promise<RoomMember[]> => {
  const where: WhereCondition[] = [{ field: 'room_id', operator: '=', value: roomId }]
  const rows = await dbFindMany<MemberRow>(MEMBERS_TABLE, {
    where,
    orderBy: [{ field: 'joined_at', direction: 'asc' }],
  })
  return rows.map(toMember)
}

/**
 * Throws {@link UnauthorizedRoomActionError} unless `userId` is a member
 * of `roomId` (and optionally holds at least `requiredRole`).
 *
 * Role hierarchy: `host` > `guest`. Requesting `requiredRole = 'guest'`
 * is satisfied by any membership; `requiredRole = 'host'` requires the
 * member's `role` to be `host`.
 *
 * **Always call this before any broadcast / membership-mutation /
 * privileged read in your handler.** This is the IDOR fix.
 *
 * @param roomId - Room being acted on.
 * @param userId - Acting user id.
 * @param requiredRole - Minimum role required. Optional.
 * @returns The member row (useful when the caller needs the role).
 */
export const assertCanAct = async (
  roomId: string,
  userId: string,
  requiredRole?: RoomRole,
): Promise<RoomMember> => {
  const row = await dbFindOne<MemberRow>(MEMBERS_TABLE, [
    { field: 'room_id', operator: '=', value: roomId },
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (!row) throw new UnauthorizedRoomActionError(roomId, userId, requiredRole)
  if (requiredRole === 'host' && row.role !== 'host') {
    throw new UnauthorizedRoomActionError(roomId, userId, 'host')
  }
  return toMember(row)
}

/**
 * Broadcasts an event to all subscribers of a room via the bonded
 * `realtime` provider.
 *
 * **Caller responsibility:** authorise first via {@link assertCanAct}.
 * This function is intentionally unauthenticated to keep it composable
 * — middleware/handlers decide whether the actor is allowed to publish.
 *
 * @param roomId - Room to broadcast on.
 * @param event - Event kind + payload.
 * @returns The {@link RoomEvent} that was broadcast (useful for echo /
 *          local persistence).
 */
export const broadcast = async (roomId: string, event: BroadcastOptions): Promise<RoomEvent> => {
  const sentAt = event.sentAt ?? new Date()
  const roomEvent: RoomEvent = {
    roomId,
    kind: event.kind,
    payload: event.payload,
    sentAt,
  }
  await realtimeBroadcast(channelFor(roomId), event.kind, {
    roomId,
    payload: event.payload,
    sentAt: sentAt.toISOString(),
  })
  return roomEvent
}

/**
 * Live per-channel subscriber registry backing {@link subscribe}.
 *
 * The bonded realtime provider's `onMessage` is a single global per-process
 * sink with **no** `off`/remove counterpart, so calling it once per
 * `subscribe()` would install — and permanently leak — a fresh transport
 * listener on every call. Instead this package installs exactly **one** shared
 * transport listener (see the module-load registration below) that fans each
 * incoming message out to the handlers registered for its channel.
 * `subscribe()` adds its handler to the channel's set; the returned unsubscribe
 * removes it (deleting the channel entry once its last handler leaves). The
 * transport therefore carries a single fixed listener for the process lifetime
 * regardless of how many rooms or handlers subscribe.
 *
 * Keyed by transport channel ({@link channelFor}). `channel` ↔ `roomId` is 1:1,
 * so each entry carries the `roomId` it maps to for event construction.
 */
interface ChannelSubscription {
  /** Room id this channel maps to. */
  roomId: string
  /** Live per-subscription handlers registered for this channel. */
  handlers: Set<RoomEventHandler>
}

const channelSubscriptions = new Map<string, ChannelSubscription>()

/**
 * Normalises a raw transport message's data into `{ payload, sentAt }`.
 *
 * A message broadcast via {@link broadcast} wraps the body as
 * `{ roomId, payload, sentAt }`; anything else is treated as the raw payload.
 *
 * @param data - Raw transport message data.
 * @returns The extracted payload and parsed `sentAt` Date.
 */
const normaliseEventData = (data: unknown): { payload: unknown; sentAt: Date } => {
  const payload =
    data && typeof data === 'object' && 'payload' in (data as Record<string, unknown>)
      ? (data as { payload: unknown }).payload
      : data
  const sentAtRaw =
    data && typeof data === 'object' && 'sentAt' in (data as Record<string, unknown>)
      ? (data as { sentAt: unknown }).sentAt
      : undefined
  const sentAt =
    sentAtRaw instanceof Date
      ? sentAtRaw
      : typeof sentAtRaw === 'string'
        ? new Date(sentAtRaw)
        : new Date()
  return { payload, sentAt }
}

/**
 * The one shared transport listener. Dispatches each incoming transport
 * message to every live handler registered for its channel; a message on a
 * channel with no (remaining) subscribers is ignored.
 *
 * @param channel - Transport channel the message arrived on.
 * @param _clientId - Sending client id (unused — room events are room-scoped).
 * @param kind - Event name.
 * @param data - Raw event data.
 */
const dispatchTransportMessage = (
  channel: string,
  _clientId: string,
  kind: string,
  data: unknown,
): void => {
  const subscription = channelSubscriptions.get(channel)
  if (!subscription || subscription.handlers.size === 0) return
  const { payload, sentAt } = normaliseEventData(data)
  const event: RoomEvent = { roomId: subscription.roomId, kind, payload, sentAt }
  // Snapshot so a handler that unsubscribes mid-dispatch can't mutate the set
  // being iterated.
  for (const handler of [...subscription.handlers]) {
    void handler(event)
  }
}

// Install the single shared transport listener exactly once, at module load.
// api-realtime buffers onMessage registrations made before a provider is
// bonded and flushes them on setProvider(), so registering here — well before
// the realtime bond binds at server-creation — is safe and order-independent.
realtimeOnMessage(dispatchTransportMessage)

/**
 * Subscribes `handler` to every event broadcast on `roomId`.
 *
 * This package installs exactly **one** transport-level `onMessage` listener
 * for the whole process (at module load) and multiplexes it: `subscribe()`
 * registers `handler` against the room's channel and the returned
 * {@link Unsubscribe} removes *that* handler. Subscribing installs no
 * additional transport listener, and unsubscribing fully detaches the handler
 * from the registry — so listeners never accumulate and it is safe to
 * subscribe / unsubscribe per request. The unsubscribe is idempotent.
 *
 * @param roomId - Room to subscribe to.
 * @param handler - Invoked with each {@link RoomEvent} broadcast on the room.
 * @returns Idempotent function that removes this subscription.
 */
export const subscribe = (roomId: string, handler: RoomEventHandler): Unsubscribe => {
  const channel = channelFor(roomId)
  let subscription = channelSubscriptions.get(channel)
  if (!subscription) {
    subscription = { roomId, handlers: new Set<RoomEventHandler>() }
    channelSubscriptions.set(channel, subscription)
  }
  subscription.handlers.add(handler)

  let active = true
  return () => {
    if (!active) return
    active = false
    const current = channelSubscriptions.get(channel)
    if (!current) return
    current.handlers.delete(handler)
    if (current.handlers.size === 0) channelSubscriptions.delete(channel)
  }
}
