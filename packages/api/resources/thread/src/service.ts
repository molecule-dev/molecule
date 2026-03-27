/**
 * Thread business logic service.
 *
 * Uses the abstract DataStore from `@molecule/api-database` for all
 * persistence — never raw SQL.
 *
 * @module
 */

import {
  count,
  create as dbCreate,
  deleteById,
  findById,
  findMany,
  updateById,
} from '@molecule/api-database'

import type {
  CreateMessageInput,
  CreateThreadInput,
  PaginatedResult,
  PaginationOptions,
  Thread,
  ThreadMessage,
  ThreadQuery,
  ThreadReadStatus,
  UpdateMessageInput,
  UpdateThreadInput,
} from './types.js'

const THREADS_TABLE = 'threads'
const MESSAGES_TABLE = 'thread_messages'
const READ_STATUS_TABLE = 'thread_read_status'

/**
 * Creates a new thread.
 *
 * @param creatorId - The ID of the user creating the thread.
 * @param data - The thread creation input.
 * @returns The created thread.
 */
export async function createThread(creatorId: string, data: CreateThreadInput): Promise<Thread> {
  const result = await dbCreate<Thread>(THREADS_TABLE, {
    title: data.title,
    creatorId,
    resourceType: data.resourceType ?? null,
    resourceId: data.resourceId ?? null,
    closed: false,
  })
  return result.data!
}

/**
 * Retrieves a single thread by ID.
 *
 * @param threadId - The thread ID to look up.
 * @returns The thread or `null` if not found.
 */
export async function getThreadById(threadId: string): Promise<Thread | null> {
  return findById<Thread>(THREADS_TABLE, threadId)
}

/**
 * Retrieves paginated threads for a user (threads where the user has posted messages).
 *
 * @param userId - The user ID to find threads for.
 * @param options - Query and pagination options.
 * @returns A paginated result of threads.
 */
export async function getThreads(
  userId: string,
  options: ThreadQuery = {},
): Promise<PaginatedResult<Thread>> {
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0

  const where = [
    { field: 'creatorId', operator: '=' as const, value: userId },
    ...(options.resourceType !== undefined
      ? [{ field: 'resourceType', operator: '=' as const, value: options.resourceType }]
      : []),
    ...(options.resourceId !== undefined
      ? [{ field: 'resourceId', operator: '=' as const, value: options.resourceId }]
      : []),
    ...(options.closed !== undefined
      ? [{ field: 'closed', operator: '=' as const, value: options.closed }]
      : []),
  ]

  const [data, total] = await Promise.all([
    findMany<Thread>(THREADS_TABLE, {
      where,
      orderBy: [{ field: 'updatedAt', direction: 'desc' }],
      limit,
      offset,
    }),
    count(THREADS_TABLE, where),
  ])

  return { data, total, limit, offset }
}

/**
 * Updates a thread. Only the thread creator can update.
 *
 * @param threadId - The thread ID to update.
 * @param userId - The requesting user's ID (must match thread creator).
 * @param data - The update input.
 * @returns The updated thread or `null` if not found or unauthorized.
 */
export async function updateThread(
  threadId: string,
  userId: string,
  data: UpdateThreadInput,
): Promise<Thread | null> {
  const existing = await findById<Thread>(THREADS_TABLE, threadId)
  if (!existing || existing.creatorId !== userId) return null

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (data.title !== undefined) updates.title = data.title
  if (data.closed !== undefined) updates.closed = data.closed

  const result = await updateById<Thread>(THREADS_TABLE, threadId, updates)
  return result.data
}

/**
 * Deletes a thread. Only the thread creator can delete.
 *
 * @param threadId - The thread ID to delete.
 * @param userId - The requesting user's ID (must match thread creator).
 * @returns `true` if deleted, `false` if not found or unauthorized.
 */
export async function deleteThread(threadId: string, userId: string): Promise<boolean> {
  const existing = await findById<Thread>(THREADS_TABLE, threadId)
  if (!existing || existing.creatorId !== userId) return false

  await deleteById(THREADS_TABLE, threadId)
  return true
}

/**
 * Adds a message to a thread.
 *
 * @param threadId - The thread ID to add the message to.
 * @param userId - The ID of the user sending the message.
 * @param data - The message creation input.
 * @returns The created message, or `null` if the thread is closed or not found.
 */
export async function addMessage(
  threadId: string,
  userId: string,
  data: CreateMessageInput,
): Promise<ThreadMessage | null> {
  const thread = await findById<Thread>(THREADS_TABLE, threadId)
  if (!thread || thread.closed) return null

  const result = await dbCreate<ThreadMessage>(MESSAGES_TABLE, {
    threadId,
    userId,
    body: data.body,
    editedAt: null,
  })

  await updateById(THREADS_TABLE, threadId, { updatedAt: new Date().toISOString() })

  return result.data!
}

/**
 * Retrieves paginated messages for a thread, ordered by creation date ascending.
 *
 * @param threadId - The thread ID to get messages for.
 * @param options - Pagination options.
 * @returns A paginated result of messages.
 */
export async function getMessages(
  threadId: string,
  options: PaginationOptions = {},
): Promise<PaginatedResult<ThreadMessage>> {
  const limit = options.limit ?? 50
  const offset = options.offset ?? 0

  const where = [{ field: 'threadId', operator: '=' as const, value: threadId }]

  const [data, total] = await Promise.all([
    findMany<ThreadMessage>(MESSAGES_TABLE, {
      where,
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
      limit,
      offset,
    }),
    count(MESSAGES_TABLE, where),
  ])

  return { data, total, limit, offset }
}

/**
 * Updates a message. Only the message author can update.
 *
 * @param messageId - The message ID to update.
 * @param userId - The requesting user's ID (must match message author).
 * @param data - The update input.
 * @returns The updated message or `null` if not found or unauthorized.
 */
export async function updateMessage(
  messageId: string,
  userId: string,
  data: UpdateMessageInput,
): Promise<ThreadMessage | null> {
  const existing = await findById<ThreadMessage>(MESSAGES_TABLE, messageId)
  if (!existing || existing.userId !== userId) return null

  const result = await updateById<ThreadMessage>(MESSAGES_TABLE, messageId, {
    body: data.body,
    editedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  return result.data
}

/**
 * Deletes a message. Only the message author can delete.
 *
 * @param messageId - The message ID to delete.
 * @param userId - The requesting user's ID (must match message author).
 * @returns `true` if deleted, `false` if not found or unauthorized.
 */
export async function deleteMessage(messageId: string, userId: string): Promise<boolean> {
  const existing = await findById<ThreadMessage>(MESSAGES_TABLE, messageId)
  if (!existing || existing.userId !== userId) return false

  await deleteById(MESSAGES_TABLE, messageId)
  return true
}

/**
 * Marks a thread as read up to a specific message for a user.
 *
 * @param threadId - The thread ID.
 * @param userId - The user marking the thread as read.
 * @param lastReadMessageId - The ID of the last message read.
 */
export async function markRead(
  threadId: string,
  userId: string,
  lastReadMessageId: string,
): Promise<void> {
  const where = [
    { field: 'threadId', operator: '=' as const, value: threadId },
    { field: 'userId', operator: '=' as const, value: userId },
  ]

  const existing = await findMany<ThreadReadStatus>(READ_STATUS_TABLE, { where, limit: 1 })

  if (existing.length > 0) {
    await updateById(READ_STATUS_TABLE, existing[0].threadId, {
      lastReadMessageId,
      updatedAt: new Date().toISOString(),
    })
  } else {
    await dbCreate(READ_STATUS_TABLE, {
      threadId,
      userId,
      lastReadMessageId,
      updatedAt: new Date().toISOString(),
    })
  }
}

/**
 * Returns the number of unread threads for a user.
 * A thread is unread if it has messages newer than the user's last-read position,
 * or if the user has never read it and it contains messages.
 *
 * @param userId - The user ID.
 * @returns The count of threads with unread messages.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const readStatuses = await findMany<ThreadReadStatus>(READ_STATUS_TABLE, {
    where: [{ field: 'userId', operator: '=', value: userId }],
    limit: 1000,
  })

  const userThreads = await findMany<Thread>(THREADS_TABLE, {
    where: [{ field: 'creatorId', operator: '=', value: userId }],
    limit: 1000,
  })

  let unreadCount = 0

  for (const thread of userThreads) {
    const readStatus = readStatuses.find((rs) => rs.threadId === thread.id)
    const messageWhere = [{ field: 'threadId', operator: '=' as const, value: thread.id }]

    if (readStatus) {
      const lastReadMessage = await findById<ThreadMessage>(
        MESSAGES_TABLE,
        readStatus.lastReadMessageId,
      )
      if (lastReadMessage) {
        const newerMessages = await count(MESSAGES_TABLE, [
          ...messageWhere,
          { field: 'createdAt', operator: '>', value: lastReadMessage.createdAt },
        ])
        if (newerMessages > 0) unreadCount++
      }
    } else {
      const messageCount = await count(MESSAGES_TABLE, messageWhere)
      if (messageCount > 0) unreadCount++
    }
  }

  return unreadCount
}
