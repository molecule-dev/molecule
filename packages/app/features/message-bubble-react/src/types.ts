import type { ReactNode } from 'react'

/**
 * Message / chat types.
 *
 * @module
 */
export interface MessageAuthor {
  /** Author id — used to derive `role` (self vs other) in rendering. */
  id: string
  /** Display name. */
  name: string
  /** Optional avatar URL. */
  avatarSrc?: string
}

/**
 *
 */
export interface MessageData {
  id: string
  author: MessageAuthor
  /** Message body — typically plain text, but can be a ReactNode for rich content. */
  body: ReactNode
  /** ISO timestamp or any node to render as "time ago". */
  timestamp: ReactNode
  /** Optional attachments list (rendered below the body). */
  attachments?: ReactNode
  /** Optional reactions row. */
  reactions?: ReactNode
  /** Optional thread-indicator (reply count + last reply time). */
  thread?: ReactNode
}
