/**
 * Types for the Solid log viewer — the Solid counterpart of
 * `@molecule/app-log-viewer-react`'s types, same props and DOM.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Severity level of a log entry, ordered from lowest to highest. */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/** Shape of a single structured log entry rendered by LogViewer. */
export interface LogEntry {
  id: string
  /** ISO timestamp or formatted string (React's `ReactNode`: text, or a node). */
  timestamp: JSX.Element
  /** Severity level. */
  level: LogLevel
  /** Single-line message. */
  message: JSX.Element
  /** Optional service / component label (e.g. "auth-api"). */
  service?: JSX.Element
  /** Optional trace id / request id. */
  traceId?: JSX.Element
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
  /** Empty-state content. */
  emptyState?: JSX.Element
}
