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
  /** Stable id (uuid-ish) used as the render key. */
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
  { type: 'content'; delta: string } | { type: 'done' } | { type: 'error'; message: string }

/**
 * Props for {@link ./embeddable-chat-widget.component.ts!EmbeddableChatWidget |
 * `EmbeddableChatWidget`}. The `.ts` component files describe their
 * `inputs`/`outputs` in decorator metadata (`.svelte`-style typed props are
 * not available to Angular's JIT compiler), so these interfaces record the
 * React prop names each component honours.
 */
export interface EmbeddableChatWidgetProps {
  /** Widget configuration (the `config` input). */
  config: EmbeddableChatWidgetConfig
  /** Optional initial expanded state (default: collapsed) — the `defaultOpen` input. */
  defaultOpen?: boolean
}

/**
 * Props for {@link ./embeddable-chat-launcher.component.ts!EmbeddableChatLauncher |
 * `EmbeddableChatLauncher`}. React's `onOpen` callback prop is the Angular
 * `open` output (`EventEmitter<MouseEvent>`).
 */
export interface EmbeddableChatLauncherProps {
  /** Whether the launcher should render. Hidden while the panel is expanded. */
  visible: boolean
  /** Click handler — flips the widget into expanded state (the `open` output). */
  onOpen: (event: MouseEvent) => void
  /** Floating position (`bottom-right` | `bottom-left`). */
  position: EmbeddableChatWidgetPosition
  /** Optional theme. */
  theme?: EmbeddableChatWidgetTheme
  /** Extra classes. */
  className?: string
}

/**
 * Props for {@link ./embeddable-chat-panel.component.ts!EmbeddableChatPanel |
 * `EmbeddableChatPanel`}. React's `onClose` callback prop is the Angular
 * `close` output (`EventEmitter<MouseEvent>`).
 */
export interface EmbeddableChatPanelProps {
  /** Whether the panel is expanded (visible) or collapsed (hidden). */
  visible: boolean
  /** Close handler — collapses back to launcher (the `close` output). */
  onClose: (event: MouseEvent) => void
  /** Floating corner. */
  position: EmbeddableChatWidgetPosition
  /** Resolved widget config. */
  config: EmbeddableChatWidgetConfig
}

/** Props for the panel's internal message bubble (React's `PanelMessage`). */
export interface PanelMessageProps {
  /** The message to render. */
  message: EmbeddableChatMessage
  /** The optional widget theme (the panel passes its config's theme). */
  theme: EmbeddableChatWidgetConfig['theme']
}
