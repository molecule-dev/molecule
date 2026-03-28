/**
 * AICopilot provider interface and types.
 *
 * Defines the contract for inline AI suggestion providers.
 * Implement this interface in a bond package to provide
 * a concrete ai-copilot implementation.
 *
 * @module
 */

/**
 * A range within a document, using 0-based line and column numbers.
 */
export interface CopilotRange {
  /** Start line (0-based). */
  startLine: number
  /** Start column (0-based). */
  startColumn: number
  /** End line (0-based). */
  endLine: number
  /** End column (0-based). */
  endColumn: number
}

/**
 * A single inline suggestion returned by the copilot provider.
 */
export interface CopilotSuggestion {
  /** Unique identifier for this suggestion. */
  id: string
  /** The suggested text to insert or replace. */
  text: string
  /** Document range to replace. When omitted, text is inserted at the cursor. */
  range?: CopilotRange
  /** Short display label (e.g., for a suggestion list UI). */
  label?: string
  /** Arbitrary provider-specific metadata. */
  metadata?: Record<string, unknown>
}

/**
 * Context sent to the copilot provider to generate suggestions.
 * Mirrors the information available in a typical code editor.
 */
export interface CopilotContext {
  /** Document content before the cursor position. */
  prefix: string
  /** Document content after the cursor position. */
  suffix: string
  /** Language identifier (e.g., "typescript", "python"). */
  language?: string
  /** File path or name for additional context. */
  filePath?: string
  /** Cursor line (0-based). */
  cursorLine?: number
  /** Cursor column (0-based). */
  cursorColumn?: number
}

/**
 * Configuration passed to copilot provider methods.
 */
export interface AICopilotConfig {
  /** Backend endpoint URL for suggestion requests. */
  endpoint: string
  /** Maximum number of suggestions to return per request. */
  maxSuggestions?: number
  /** AI model identifier to use for generation. */
  model?: string
  /** Project identifier for scoped context. */
  projectId?: string
}

/**
 * Discriminated union of events emitted during suggestion generation.
 */
export type CopilotEvent =
  | { type: 'suggestion'; suggestion: CopilotSuggestion }
  | { type: 'suggestions'; suggestions: CopilotSuggestion[] }
  | { type: 'done' }
  | { type: 'error'; message: string }

/**
 * Callback for receiving copilot events during streaming.
 *
 * @param event - The copilot event.
 */
export type CopilotEventHandler = (event: CopilotEvent) => void

/**
 * Provider interface for inline AI suggestions.
 *
 * Bond packages implement this interface to supply completions
 * from different backends (HTTP, WebSocket, local model, etc.).
 */
export interface AICopilotProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Requests inline suggestions for the given editor context.
   * Results are delivered via the `onEvent` callback as they arrive.
   *
   * @param context - Current editor state (prefix, suffix, language, etc.).
   * @param config - Endpoint, model, and other request-level configuration.
   * @param onEvent - Callback invoked for each suggestion or terminal event.
   * @returns Resolves when the suggestion stream completes.
   */
  getSuggestions(
    context: CopilotContext,
    config: AICopilotConfig,
    onEvent: CopilotEventHandler,
  ): Promise<void>

  /**
   * Notifies the backend that a suggestion was accepted by the user.
   * Used for analytics and model improvement.
   *
   * @param suggestion - The accepted suggestion.
   * @param config - Request-level configuration.
   */
  acceptSuggestion(suggestion: CopilotSuggestion, config: AICopilotConfig): Promise<void>

  /**
   * Notifies the backend that a suggestion was dismissed by the user.
   *
   * @param suggestion - The rejected suggestion.
   * @param config - Request-level configuration.
   */
  rejectSuggestion(suggestion: CopilotSuggestion, config: AICopilotConfig): Promise<void>

  /**
   * Cancels any in-flight suggestion request.
   */
  abort(): void
}
