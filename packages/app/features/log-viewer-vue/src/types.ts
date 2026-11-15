/**
 * Types for the Vue log viewer — the Vue counterpart of
 * `@molecule/app-log-viewer-react`'s types, same props and DOM.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Severity level of a log entry, ordered from lowest to highest. */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/** Shape of a single structured log entry rendered by LogViewer. */
export interface LogEntry {
  id: string
  /** ISO timestamp or formatted string (React's `ReactNode`: text, or a node). */
  timestamp: VNodeChild
  /** Severity level. */
  level: LogLevel
  /** Single-line message. */
  message: VNodeChild
  /** Optional service / component label (e.g. "auth-api"). */
  service?: VNodeChild
  /** Optional trace id / request id. */
  traceId?: VNodeChild
  /** Optional structured data shown in the expandable panel. */
  data?: unknown
}

/** Props for {@link LogViewer}. */
export interface LogViewerProps {
  entries: LogEntry[]
  /** Called when an entry expands/collapses. */
  onToggle?: (id: string, expanded: boolean) => void
  /** Extra classes on the list wrapper. */
  className?: string
  /** Empty-state content (may arrive as the `emptyState` slot). */
  emptyState?: VNodeChild
}
