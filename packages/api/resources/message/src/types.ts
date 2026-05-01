/**
 * Direct-message resource type definitions.
 *
 * Models 1:1 messaging between two participants. A `Thread` is the
 * canonical conversation between participants A and B. Participants are
 * canonicalised on insert so `(a, b)` and `(b, a)` resolve to the same
 * thread. `unread_count_a` / `unread_count_b` track unread messages for
 * each side.
 *
 * @module
 */

/**
 * A 1:1 messaging thread between two participants.
 *
 * `participantAId` and `participantBId` are stored canonically — the
 * smaller value (lexicographically) is always `participantAId`. Use
 * {@link getOrCreateThread} to look up or create a thread between two
 * users without worrying about ordering.
 */
export interface Thread {
  /** Unique thread identifier. */
  id: string
  /** Lexicographically-smaller participant ID. */
  participantAId: string
  /** Lexicographically-larger participant ID. */
  participantBId: string
  /** Timestamp of the most recent message, or `null` if no messages exist. */
  lastMessageAt: string | null
  /** Number of messages participant A has not yet read. */
  unreadCountA: number
  /** Number of messages participant B has not yet read. */
  unreadCountB: number
  /** When the thread was created (ISO 8601). */
  createdAt: string
  /** When the thread was last updated (ISO 8601). */
  updatedAt: string
}

/**
 * A message attachment reference.
 */
export interface MessageAttachment {
  /** Public or signed URL to the attachment payload. */
  url: string
  /** MIME type of the attachment (e.g. `image/png`). */
  mime: string
}

/**
 * A single message within a {@link Thread}.
 *
 * `editedAt` and `deletedAt` are `null` until the message is mutated. A
 * soft-deleted message (`deletedAt !== null`) is preserved for audit /
 * thread continuity but should not be rendered as content.
 */
export interface Message {
  /** Unique message identifier. */
  id: string
  /** Thread this message belongs to. */
  threadId: string
  /** ID of the user who sent the message. */
  senderId: string
  /** Message body text. */
  body: string
  /** Optional file/image attachments. */
  attachments: MessageAttachment[]
  /** When the message was created (ISO 8601). */
  createdAt: string
  /** When the message was last edited, or `null`. */
  editedAt: string | null
  /** When the message was soft-deleted, or `null`. */
  deletedAt: string | null
}

/**
 * Options for paginating messages within a thread.
 */
export interface ListMessagesOptions {
  /** Return messages strictly older than this timestamp (ISO 8601). */
  before?: string
  /** Maximum number of messages to return. Defaults to 50, max 200. */
  limit?: number
}

/**
 * Realtime event names emitted by this package.
 *
 * Subscribers should listen on the room ID returned from
 * {@link threadRoomId} for the thread they care about.
 */
export const MESSAGE_REALTIME_EVENTS = {
  /** A new message was sent in the thread. Payload: {@link Message}. */
  messageSent: 'message:sent',
  /** A participant marked the thread as read. Payload: `{ threadId, readerId, readAt }`. */
  messageRead: 'message:read',
} as const

/** Union of realtime event names. */
export type MessageRealtimeEvent =
  (typeof MESSAGE_REALTIME_EVENTS)[keyof typeof MESSAGE_REALTIME_EVENTS]

/**
 * Returns the realtime room ID for a given thread.
 *
 * @param threadId - The thread ID.
 * @returns The room ID consumers should subscribe to for thread events.
 */
export function threadRoomId(threadId: string): string {
  return `thread:${threadId}`
}
