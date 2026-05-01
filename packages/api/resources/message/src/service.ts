/**
 * Message resource business logic.
 *
 * Uses the abstract DataStore from `@molecule/api-database` for all
 * persistence — never raw SQL. Realtime broadcast is delegated to
 * `@molecule/api-realtime` and is no-op when no realtime provider is
 * bonded.
 *
 * @module
 */

import {
  count,
  create as dbCreate,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { broadcast, hasProvider as hasRealtimeProvider } from '@molecule/api-realtime'

import {
  MESSAGE_REALTIME_EVENTS,
  threadRoomId,
  type ListMessagesOptions,
  type Message,
  type MessageAttachment,
  type Thread,
} from './types.js'

const THREADS_TABLE = 'message_threads'
const MESSAGES_TABLE = 'messages'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200

/**
 * Canonicalises a (a, b) participant pair so that the lexicographically
 * smaller value is always returned first. This guarantees `(x, y)` and
 * `(y, x)` resolve to the same {@link Thread} row.
 *
 * @param a - First participant ID.
 * @param b - Second participant ID.
 * @returns A tuple `[participantAId, participantBId]` in canonical order.
 * @throws {Error} If `a` and `b` refer to the same participant.
 */
export function canonicaliseParticipants(a: string, b: string): [string, string] {
  if (a === b) {
    throw new Error('Cannot create a 1:1 thread with the same participant on both sides')
  }
  return a < b ? [a, b] : [b, a]
}

/**
 * Looks up the canonical thread between two participants, creating it
 * lazily if none exists.
 *
 * @param a - First participant user ID.
 * @param b - Second participant user ID.
 * @returns The existing or newly-created thread.
 */
export async function getOrCreateThread(a: string, b: string): Promise<Thread> {
  const [participantAId, participantBId] = canonicaliseParticipants(a, b)

  const existing = await findOne<Thread>(THREADS_TABLE, [
    { field: 'participantAId', operator: '=', value: participantAId },
    { field: 'participantBId', operator: '=', value: participantBId },
  ])

  if (existing) return existing

  const result = await dbCreate<Thread>(THREADS_TABLE, {
    participantAId,
    participantBId,
    lastMessageAt: null,
    unreadCountA: 0,
    unreadCountB: 0,
  })

  if (!result.data) {
    throw new Error('Failed to create message thread')
  }
  return result.data
}

/**
 * Retrieves a thread by ID.
 *
 * @param threadId - The thread ID.
 * @returns The thread, or `null` if not found.
 */
export async function getThreadById(threadId: string): Promise<Thread | null> {
  return findById<Thread>(THREADS_TABLE, threadId)
}

/**
 * Lists threads a participant is part of, ordered by most recent activity.
 *
 * @param participantId - The user ID to list threads for.
 * @param options - Pagination options.
 * @returns Array of threads in descending `lastMessageAt` order.
 */
export async function listThreadsForParticipant(
  participantId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<Thread[]> {
  const limit = clampLimit(options.limit, DEFAULT_PAGE_SIZE)
  const offset = options.offset ?? 0

  // Two queries unioned in memory because most DataStore backends do not
  // expose OR filters on the abstract interface.
  const [asA, asB] = await Promise.all([
    findMany<Thread>(THREADS_TABLE, {
      where: [{ field: 'participantAId', operator: '=', value: participantId }],
      orderBy: [{ field: 'lastMessageAt', direction: 'desc' }],
      limit: limit + offset,
    }),
    findMany<Thread>(THREADS_TABLE, {
      where: [{ field: 'participantBId', operator: '=', value: participantId }],
      orderBy: [{ field: 'lastMessageAt', direction: 'desc' }],
      limit: limit + offset,
    }),
  ])

  const merged = [...asA, ...asB].sort((x, y) => {
    const xt = x.lastMessageAt ?? ''
    const yt = y.lastMessageAt ?? ''
    if (xt === yt) return x.id < y.id ? 1 : -1
    return xt < yt ? 1 : -1
  })

  return merged.slice(offset, offset + limit)
}

/**
 * Sends a message in a thread. Updates `lastMessageAt` and bumps the
 * recipient's `unreadCount*` counter, then broadcasts the new message
 * over the bonded realtime provider (if any).
 *
 * @param threadId - The target thread ID.
 * @param senderId - The sending participant's user ID.
 * @param body - Message body. Must be non-empty after trimming.
 * @param attachments - Optional attachment list.
 * @returns The persisted message.
 * @throws {Error} If the thread does not exist, the sender is not a
 *   participant, or the body is empty.
 */
export async function sendMessage(
  threadId: string,
  senderId: string,
  body: string,
  attachments: MessageAttachment[] = [],
): Promise<Message> {
  if (!body || !body.trim()) {
    throw new Error('Message body must be non-empty')
  }

  const thread = await findById<Thread>(THREADS_TABLE, threadId)
  if (!thread) {
    throw new Error(`Thread not found: ${threadId}`)
  }
  if (senderId !== thread.participantAId && senderId !== thread.participantBId) {
    throw new Error('Sender is not a participant in this thread')
  }

  const now = new Date().toISOString()

  const result = await dbCreate<Message>(MESSAGES_TABLE, {
    threadId,
    senderId,
    body,
    attachments,
    createdAt: now,
    editedAt: null,
    deletedAt: null,
  })

  if (!result.data) {
    throw new Error('Failed to persist message')
  }

  // Bump the recipient's unread counter and refresh lastMessageAt.
  const recipientField = senderId === thread.participantAId ? 'unreadCountB' : 'unreadCountA'
  const currentRecipientUnread =
    senderId === thread.participantAId ? thread.unreadCountB : thread.unreadCountA

  await updateById(THREADS_TABLE, threadId, {
    lastMessageAt: now,
    [recipientField]: currentRecipientUnread + 1,
    updatedAt: now,
  })

  // Optional realtime broadcast — silently no-ops without a bonded provider.
  if (hasRealtimeProvider()) {
    try {
      await broadcast(threadRoomId(threadId), MESSAGE_REALTIME_EVENTS.messageSent, result.data)
    } catch {
      // Realtime delivery is best-effort; persistence already succeeded.
    }
  }

  return result.data
}

/**
 * Marks a thread as read for the given participant and resets their
 * unread counter to zero. Broadcasts a `message:read` event.
 *
 * @param threadId - The thread ID.
 * @param readerId - The participant user ID marking the thread as read.
 * @throws {Error} If the thread does not exist or the reader is not a
 *   participant.
 */
export async function markRead(threadId: string, readerId: string): Promise<void> {
  const thread = await findById<Thread>(THREADS_TABLE, threadId)
  if (!thread) {
    throw new Error(`Thread not found: ${threadId}`)
  }
  if (readerId !== thread.participantAId && readerId !== thread.participantBId) {
    throw new Error('Reader is not a participant in this thread')
  }

  const now = new Date().toISOString()
  const counterField = readerId === thread.participantAId ? 'unreadCountA' : 'unreadCountB'

  await updateById(THREADS_TABLE, threadId, {
    [counterField]: 0,
    updatedAt: now,
  })

  if (hasRealtimeProvider()) {
    try {
      await broadcast(threadRoomId(threadId), MESSAGE_REALTIME_EVENTS.messageRead, {
        threadId,
        readerId,
        readAt: now,
      })
    } catch {
      // Best-effort.
    }
  }
}

/**
 * Lists messages in a thread, newest first. Soft-deleted messages are
 * still returned (with `deletedAt` set) so clients can render
 * "this message was deleted" placeholders.
 *
 * @param threadId - The thread ID.
 * @param options - Pagination options. `before` returns messages strictly
 *   older than the given ISO timestamp; `limit` is clamped to 200.
 * @returns Array of messages, newest first.
 */
export async function listMessages(
  threadId: string,
  options: ListMessagesOptions = {},
): Promise<Message[]> {
  const limit = clampLimit(options.limit, DEFAULT_PAGE_SIZE)

  const where: Array<{ field: string; operator: '=' | '<'; value: unknown }> = [
    { field: 'threadId', operator: '=', value: threadId },
  ]
  if (options.before) {
    where.push({ field: 'createdAt', operator: '<', value: options.before })
  }

  return findMany<Message>(MESSAGES_TABLE, {
    where,
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit,
  })
}

/**
 * Edits an existing message body. Only the original sender may edit.
 *
 * @param messageId - The message ID.
 * @param senderId - The user ID claiming to be the message author.
 * @param body - New non-empty message body.
 * @returns The updated message, or `null` if not found / not authorised.
 */
export async function editMessage(
  messageId: string,
  senderId: string,
  body: string,
): Promise<Message | null> {
  if (!body || !body.trim()) {
    throw new Error('Message body must be non-empty')
  }

  const existing = await findById<Message>(MESSAGES_TABLE, messageId)
  if (!existing || existing.senderId !== senderId || existing.deletedAt) {
    return null
  }

  const now = new Date().toISOString()
  const result = await updateById<Message>(MESSAGES_TABLE, messageId, {
    body,
    editedAt: now,
  })
  return result.data
}

/**
 * Soft-deletes a message. Only the original sender may delete.
 *
 * @param messageId - The message ID.
 * @param senderId - The user ID claiming to be the message author.
 * @returns `true` if the message was soft-deleted, `false` if not found
 *   or not authorised.
 */
export async function deleteMessage(messageId: string, senderId: string): Promise<boolean> {
  const existing = await findById<Message>(MESSAGES_TABLE, messageId)
  if (!existing || existing.senderId !== senderId || existing.deletedAt) {
    return false
  }

  const now = new Date().toISOString()
  await updateById(MESSAGES_TABLE, messageId, {
    deletedAt: now,
    body: '',
    attachments: [],
  })
  return true
}

/**
 * Counts unread messages for a participant across all of their threads.
 *
 * @param participantId - The participant user ID.
 * @returns Total unread message count across every thread.
 */
export async function getTotalUnreadCount(participantId: string): Promise<number> {
  const [asA, asB] = await Promise.all([
    findMany<Thread>(THREADS_TABLE, {
      where: [{ field: 'participantAId', operator: '=', value: participantId }],
      limit: 1000,
    }),
    findMany<Thread>(THREADS_TABLE, {
      where: [{ field: 'participantBId', operator: '=', value: participantId }],
      limit: 1000,
    }),
  ])

  const total =
    asA.reduce((sum, t) => sum + (t.unreadCountA ?? 0), 0) +
    asB.reduce((sum, t) => sum + (t.unreadCountB ?? 0), 0)

  return total
}

/**
 * Counts the messages persisted in a thread (including soft-deleted).
 *
 * @param threadId - The thread ID.
 * @returns Total stored message count.
 */
export async function countMessages(threadId: string): Promise<number> {
  return count(MESSAGES_TABLE, [{ field: 'threadId', operator: '=', value: threadId }])
}

function clampLimit(value: number | undefined, fallback: number): number {
  if (!value || value <= 0) return fallback
  return Math.min(value, MAX_PAGE_SIZE)
}
