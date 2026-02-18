/**
 * Type definitions for the AI chat core interface.
 *
 * @module
 */

/**
 * A single message in a chat conversation, including role, content,
 * and optional tool-call metadata.
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  toolCalls?: ToolCall[]
  isStreaming?: boolean
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
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; output: unknown }
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
