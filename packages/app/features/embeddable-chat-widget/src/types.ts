/**
 * Types for the embeddable chat widget.
 *
 * @module
 */

/** Position of the floating launcher relative to the host viewport. */
export type EmbeddableChatWidgetPosition = 'bottom-right' | 'bottom-left'

/** Visual / branding configuration for the widget shell. */
export interface EmbeddableChatWidgetTheme {
  /** Primary accent colour (header, send button, launcher background). */
  primaryColor?: string
  /** Foreground colour to use against `primaryColor`. */
  primaryForegroundColor?: string
}

/**
 * Configuration object passed into `<EmbeddableChatWidget>`. The object is
 * intentionally flat so a host site can populate it from a single
 * `data-*` attribute on the embed div.
 */
export interface EmbeddableChatWidgetConfig {
  /** Base URL of the chat backend (no trailing slash). `/chat` is appended. */
  apiBaseUrl: string
  /** Brand name shown in the header. Required. */
  brandName: string
  /** Optional brand logo (URL) shown in the header next to the brand name. */
  brandLogo?: string
  /** Floating-launcher position. Defaults to `bottom-right`. */
  position?: EmbeddableChatWidgetPosition
  /** Visual theme overrides. */
  theme?: EmbeddableChatWidgetTheme
  /** Optional fetch override (test injection / custom auth). Defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch
}

/** A single message stored in the widget's local state. */
export interface EmbeddableChatMessage {
  /** Stable id (uuid-ish) used as the React key. */
  id: string
  /** Author role — drives alignment + accent. */
  role: 'user' | 'assistant'
  /** Plain text body. Streaming assistant messages append to this. */
  body: string
  /** Unix-ms timestamp the message started. */
  timestamp: number
}

/**
 * Streaming chat event the widget understands. The widget speaks SSE
 * (`data: {json}\n\n`) but is tolerant of plain chunked text — any
 * non-JSON payload is appended to the in-flight assistant message verbatim.
 */
export type EmbeddableChatStreamEvent =
  | { type: 'content'; delta: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
