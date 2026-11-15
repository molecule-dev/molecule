/**
 * Types for the Angular log viewer — the Angular counterpart of
 * `@molecule/app-log-viewer-react`'s types, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * A node-valued entry field (React's `ReactNode`): in Angular a field is text
 * (a string or number) or an `ng-template` reference rendered through
 * `NgTemplateOutlet` where the node would render.
 */
type LogEntryNode = TemplateRef<unknown> | string | number

/** Severity level of a log entry, ordered from lowest to highest. */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/** Shape of a single structured log entry rendered by LogViewer. */
export interface LogEntry {
  id: string
  /** ISO timestamp or formatted string. */
  timestamp: LogEntryNode
  /** Severity level. */
  level: LogLevel
  /** Single-line message. */
  message: LogEntryNode
  /** Optional service / component label (e.g. "auth-api"). */
  service?: LogEntryNode
  /** Optional trace id / request id. */
  traceId?: LogEntryNode
  /** Optional structured data shown in the expandable panel. */
  data?: unknown
}

/**
 * Props accepted by {@link LogViewer} — the same props
 * `@molecule/app-log-viewer-react` accepts. Node props (`emptyState`) are
 * projected content in Angular (an input cannot carry a node), so they are
 * typed `unknown`: pass them in the host template as `[slot=emptyState]`, not
 * as values.
 */
export interface LogViewerProps {
  entries: LogEntry[]
  /** Called when an entry expands/collapses. */
  onToggle?: (id: string, expanded: boolean) => void
  /** Extra classes on the list wrapper. */
  className?: string
  /** Empty-state content, projected as `[slot=emptyState]`. */
  emptyState?: unknown
}
