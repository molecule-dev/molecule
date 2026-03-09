/**
 * Conversation types.
 *
 * @module
 */

/**
 * A single message in a conversation (user, assistant, or system) with optional tool call data.
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: Array<{
    id: string
    name: string
    input: unknown
    output?: unknown
  }>
  /** File attachment metadata (no base64 data — for display in history). */
  attachments?: Array<{ filename: string; mediaType: string; size: number }>
  timestamp: string
}

/**
 * AI context carried across a conversation: system prompt, tool state, and model selection.
 */
export interface AIContext {
  system?: string
  toolState?: Record<string, unknown>
  model?: string
}

/**
 * A conversation record containing messages, AI context, and project association.
 */
export interface Conversation {
  id: string
  projectId: string
  messages: ChatMessage[]
  aiContext: AIContext
  createdAt: string
  updatedAt: string
}

/**
 * A file attachment sent with a chat message.
 */
export interface ChatAttachment {
  /** MIME type (e.g., 'image/jpeg', 'application/pdf'). */
  mediaType: string
  /** Base64-encoded file data (no data-URL prefix). */
  data: string
  /** Original filename for display. */
  filename?: string
}

/**
 * Input payload for sending a message to a conversation (message text and optional model override).
 */
export interface SendMessageInput {
  message: string
  model?: string
  /** File attachments (images, PDFs, audio, video) to include with the message. */
  attachments?: ChatAttachment[]
}
