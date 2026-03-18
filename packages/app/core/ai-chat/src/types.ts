/**
 * Type definitions for the AI chat core interface.
 *
 * @module
 */

/**
 * An ordered block within an assistant message, preserving the interleaved
 * sequence of text chunks and tool calls as they were received from the stream.
 */
export type MessageBlock =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; id: string }
  | { type: 'thinking'; content: string }
  | { type: 'verification'; status: 'ok' | 'error'; output?: string; workspaces: string[] }
  | { type: 'resource_limit'; resource: string; message: string }

/**
 * A file attachment sent with a chat message.
 */
export interface ChatAttachment {
  /** MIME type (e.g., 'image/jpeg', 'application/pdf'). */
  mediaType: string
  /** Base64-encoded file data (no data-URL prefix). */
  data: string
  /** Original filename for display. */
  filename: string
  /** File size in bytes (for validation and display). */
  size: number
}

/**
 * Attachment metadata stored in message history (no base64 data).
 */
export interface AttachmentMeta {
  /** Original filename. */
  filename: string
  /** MIME type. */
  mediaType: string
  /** File size in bytes. */
  size: number
}

/**
 * A single message in a chat conversation, including role, content,
 * and optional tool-call metadata.
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  /** Ordered sequence of text and tool-call blocks, preserving interleaved order. */
  blocks?: MessageBlock[]
  toolCalls?: ToolCall[]
  isStreaming?: boolean
  /** Set when the user aborted the response mid-stream. */
  aborted?: boolean
  /** Set on user messages that are queued waiting for the current stream to finish. */
  queued?: boolean
  /** Set when the agentic loop hit its iteration limit before finishing. */
  loopLimitReached?: number
  /** Persisted commit record for display in conversation history. */
  commitRecord?: { message: string; files: string[]; hash?: string }
  commitSuggestion?: CommitSuggestion
  /** File attachments sent with this message (metadata only — no base64 data in history). */
  attachments?: AttachmentMeta[]
}

/**
 * A suggested git commit after file changes, shown to the user for one-click committing.
 */
export interface CommitSuggestion {
  files: string[]
  message?: string
  status: 'pending' | 'committing' | 'committed' | 'error'
}

/**
 * A tool invocation within an assistant message, tracking its lifecycle
 * from pending through completion or error.
 */
export interface ToolCall {
  id: string
  name: string
  input: unknown
  output?: unknown
  status: 'pending' | 'running' | 'done' | 'error'
  /** Snapshot of original/modified file content captured at tool-call time (not sent to AI). */
  fileDiff?: { original: string; modified: string }
  /** Whether this tool call's file change has been undone. */
  isUndone?: boolean
}

/**
 * Configuration for a chat session, including the API endpoint,
 * project context, and optional model/prompt overrides.
 */
export interface ChatConfig {
  /** API endpoint for sending messages. */
  endpoint: string
  /** Project ID for context. */
  projectId?: string
  /** System prompt override. */
  systemPrompt?: string
  /** AI model to use. */
  model?: string
  /** When true, resume the last interrupted assistant response without adding a user message. */
  resume?: boolean
}

/**
 * Reactive state for a chat session, including messages, loading state,
 * error state, and WebSocket connection status.
 */
export interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  connectionStatus: 'connected' | 'disconnected' | 'connecting'
}

/**
 * Callback invoked for each event in a streaming chat response.
 */
export type ChatEventHandler = (event: ChatStreamEvent) => void

/**
 * Discriminated union of events emitted during a streaming chat response.
 * Events include text chunks, tool invocations, tool results, completion,
 * and errors.
 */
export type ChatStreamEvent =
  | { type: 'text'; content: string }
  | { type: 'thinking'; content: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; output: unknown }
  | { type: 'file_diff'; path: string; oldContent: string | null; newContent: string }
  | { type: 'commit_suggestion'; files: string[] }
  | { type: 'conversation'; id: string }
  | { type: 'mode'; mode: 'plan' | 'execute' }
  | { type: 'loop_limit_reached'; maxLoops: number }
  | {
      type: 'verification_result'
      status: 'ok' | 'error'
      output?: string
      workspaces: string[]
      changedPaths?: string[]
    }
  | {
      type: 'preview_error'
      errors: Array<{ message: string; source?: string; line?: number; column?: number }>
    }
  | { type: 'resource_limit'; resource: 'memory'; message: string }
  | { type: 'done'; usage?: { inputTokens: number; outputTokens: number } }
  | { type: 'error'; message: string }

/**
 * AI chat provider interface that all chat bond packages must implement.
 * Provides streaming message sending, abort, and conversation history management.
 */
export interface ChatProvider {
  readonly name: string

  /** Sends a message and streams the response via the event handler. */
  sendMessage(
    message: string,
    config: ChatConfig,
    onEvent: ChatEventHandler,
    attachments?: ChatAttachment[],
  ): Promise<void>

  /** Aborts the current streaming response. */
  abort(): void

  /** Clears the conversation history on the server. */
  clearHistory(config: ChatConfig): Promise<void>

  /** Loads the conversation history from the server. */
  loadHistory(config: ChatConfig): Promise<ChatMessage[]>
}
