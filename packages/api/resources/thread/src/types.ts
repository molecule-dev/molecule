/**
 * Thread resource type definitions.
 *
 * Threads are conversation containers with messages, participants, and
 * read-tracking. A thread can optionally be attached to a resource via
 * `resourceType` and `resourceId` (e.g. a support thread on an order).
 *
 * @module
 */

/**
 * A discussion thread containing messages between participants.
 */
export interface Thread {
  /** Unique thread identifier. */
  id: string
  /** Display title for the thread. */
  title: string
  /** The ID of the user who created the thread. */
  creatorId: string
  /** Optional resource type this thread is attached to (e.g. 'project', 'order'). */
  resourceType: string | null
  /** Optional resource ID this thread is attached to. */
  resourceId: string | null
  /** Whether the thread is closed for new messages. */
  closed: boolean
  /** When the thread was created (ISO 8601). */
  createdAt: string
  /** When the thread was last updated (ISO 8601). */
  updatedAt: string
}

/**
 * A message within a thread.
 */
export interface ThreadMessage {
  /** Unique message identifier. */
  id: string
  /** The ID of the thread this message belongs to. */
  threadId: string
  /** The ID of the user who sent the message. */
  userId: string
  /** The message body text. */
  body: string
  /** When the message was last edited, or `null` if never edited. */
  editedAt: string | null
  /** When the message was created (ISO 8601). */
  createdAt: string
  /** When the message was last updated (ISO 8601). */
  updatedAt: string
}

/**
 * Tracks the last-read position for a user in a thread.
 */
export interface ThreadReadStatus {
  /** The thread ID. */
  threadId: string
  /** The user ID. */
  userId: string
  /** The ID of the last message read by this user. */
  lastReadMessageId: string
  /** When this read status was last updated (ISO 8601). */
  updatedAt: string
}

/**
 * Input for creating a new thread.
 */
export interface CreateThreadInput {
  /** Display title for the thread. */
  title: string
  /** Optional resource type to attach the thread to. */
  resourceType?: string
  /** Optional resource ID to attach the thread to. */
  resourceId?: string
}

/**
 * Input for updating an existing thread.
 */
export interface UpdateThreadInput {
  /** Updated title for the thread. */
  title?: string
  /** Whether to close or reopen the thread. */
  closed?: boolean
}

/**
 * Input for creating a new message in a thread.
 */
export interface CreateMessageInput {
  /** The message body text. */
  body: string
}

/**
 * Input for updating an existing message.
 */
export interface UpdateMessageInput {
  /** The updated message body text. */
  body: string
}

/**
 * Options for paginated queries.
 */
export interface PaginationOptions {
  /** Maximum number of results to return. */
  limit?: number
  /** Number of results to skip. */
  offset?: number
}

/**
 * A paginated result set.
 */
export interface PaginatedResult<T> {
  /** The result items for the current page. */
  data: T[]
  /** Total number of matching items across all pages. */
  total: number
  /** Maximum number of results per page. */
  limit: number
  /** Number of results skipped. */
  offset: number
}

/**
 * Options for querying threads.
 */
export interface ThreadQuery extends PaginationOptions {
  /** Filter to only threads attached to this resource type. */
  resourceType?: string
  /** Filter to only threads attached to this resource ID. */
  resourceId?: string
  /** Filter to only open or closed threads. */
  closed?: boolean
}
