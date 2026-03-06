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
  /** Persisted commit record for display in conversation history. */
  commitRecord?: { message: string; files: string[] }
  commitSuggestion?: CommitSuggestion
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
  | { type: 'done'; usage?: { inputTokens: number; outputTokens: number } }
  | { type: 'error'; message: string }

/**
 * AI chat provider interface that all chat bond packages must implement.
 * Provides streaming message sending, abort, and conversation history management.
 */
export interface ChatProvider {
  readonly name: string

  /** Sends a message and streams the response via the event handler. */
  sendMessage(message: string, config: ChatConfig, onEvent: ChatEventHandler): Promise<void>

  /** Aborts the current streaming response. */
  abort(): void

  /** Clears the conversation history on the server. */
  clearHistory(config: ChatConfig): Promise<void>

  /** Loads the conversation history from the server. */
  loadHistory(config: ChatConfig): Promise<ChatMessage[]>
}
