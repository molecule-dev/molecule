/**
 * AIAssistant provider interface.
 *
 * Defines the contract for an AI assistant panel — a contextual side-panel
 * that wraps chat functionality with panel state management, context
 * awareness, suggestions, and session persistence.
 *
 * @module
 */

/** Position of the assistant panel relative to the viewport. */
export type AssistantPanelPosition = 'right' | 'left' | 'bottom' | 'floating'

/**
 * A single message in the assistant conversation.
 */
export interface AssistantMessage {
  /** Unique message identifier. */
  id: string
  /** Who sent the message. */
  role: 'user' | 'assistant' | 'system'
  /** Text content of the message. */
  content: string
  /** Unix timestamp in milliseconds. */
  timestamp: number
  /** Whether the message is currently being streamed. */
  isStreaming?: boolean
  /** Whether the stream was aborted before completion. */
  aborted?: boolean
}

/**
 * A contextual item describing what the user is currently looking at.
 * Providers use context to enrich prompts with relevant information.
 */
export interface AssistantContext {
  /** Context category (e.g. 'page', 'file', 'selection', 'error'). */
  type: string
  /** Human-readable label for the context item. */
  label: string
  /** The actual context value (path, code snippet, URL, etc.). */
  value: string
  /** Additional metadata for the context item. */
  metadata?: Record<string, unknown>
}

/**
 * A suggested action the user can take.
 * Displayed as quick-action chips in the assistant panel.
 */
export interface AssistantSuggestion {
  /** Unique suggestion identifier. */
  id: string
  /** Short label displayed on the chip. */
  label: string
  /** Optional longer description shown on hover. */
  description?: string
  /** The message to send when the suggestion is activated. */
  action: string
  /** Optional icon identifier. */
  icon?: string
}

/**
 * Stream events emitted during an assistant response.
 */
export type AssistantStreamEvent =
  | { type: 'text'; content: string }
  | { type: 'thinking'; content: string }
  | { type: 'suggestion'; suggestions: AssistantSuggestion[] }
  | { type: 'done'; usage?: { inputTokens: number; outputTokens: number } }
  | { type: 'error'; message: string }

/** Callback for receiving stream events. */
export type AssistantEventHandler = (event: AssistantStreamEvent) => void

/**
 * Snapshot of the assistant panel state.
 */
export interface AssistantPanelState {
  /** Whether the panel is currently visible. */
  isOpen: boolean
  /** Panel position. */
  position: AssistantPanelPosition
  /** Conversation messages. */
  messages: AssistantMessage[]
  /** Whether a response is currently streaming. */
  isLoading: boolean
  /** Current error message, if any. */
  error: string | null
  /** Current suggestions to display. */
  suggestions: AssistantSuggestion[]
  /** Active context items. */
  context: AssistantContext[]
}

/** Listener for panel state changes. */
export type AssistantStateListener = (state: AssistantPanelState) => void

/**
 * Configuration for the AI assistant provider.
 */
export interface AIAssistantConfig {
  /** API endpoint for sending messages. */
  endpoint: string
  /** Panel position. Defaults to 'right'. */
  position?: AssistantPanelPosition
  /** System-level context string prepended to conversations. */
  systemContext?: string
  /** Initial suggestions to display before the first message. */
  suggestions?: AssistantSuggestion[]
  /** Maximum number of messages to retain in the conversation. */
  maxMessages?: number
  /** Whether to persist the session across page reloads. Defaults to true. */
  persistSession?: boolean
  /** Session key for storage. Defaults to 'mol-assistant'. */
  sessionKey?: string
  /** Custom HTTP headers for API requests. */
  headers?: Record<string, string>
}

/**
 * AI assistant provider interface.
 *
 * Implementations manage panel lifecycle, messaging, context, and state.
 * Bond packages implement this interface and register via
 * `setProvider()` during app initialization.
 */
export interface AIAssistantProvider {
  /** Provider name identifier. */
  readonly name: string

  /** Open the assistant panel. */
  open(config: AIAssistantConfig): void

  /** Close the assistant panel. */
  close(): void

  /** Toggle the assistant panel open/closed. */
  toggle(config: AIAssistantConfig): void

  /**
   * Send a message and stream the response.
   *
   * @param message - The user's message text
   * @param config - Assistant configuration
   * @param onEvent - Callback for stream events
   * @returns Promise that resolves when the stream completes
   */
  sendMessage(
    message: string,
    config: AIAssistantConfig,
    onEvent: AssistantEventHandler,
  ): Promise<void>

  /** Abort the current streaming response. */
  abort(): void

  /**
   * Set the current context items.
   * Context is included in subsequent messages to provide relevance.
   *
   * @param context - Array of context items
   */
  setContext(context: AssistantContext[]): void

  /** Clear all context items. */
  clearContext(): void

  /**
   * Clear the conversation history.
   *
   * @param config - Assistant configuration
   */
  clearHistory(config: AIAssistantConfig): Promise<void>

  /**
   * Load the conversation history from the backend.
   *
   * @param config - Assistant configuration
   * @returns Array of past messages
   */
  loadHistory(config: AIAssistantConfig): Promise<AssistantMessage[]>

  /** Get the current panel state snapshot. */
  getState(): AssistantPanelState

  /**
   * Subscribe to panel state changes.
   *
   * @param listener - Callback invoked on every state change
   * @returns Unsubscribe function
   */
  subscribe(listener: AssistantStateListener): () => void
}
