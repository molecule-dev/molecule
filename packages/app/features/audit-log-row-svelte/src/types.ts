/**
 * Types for the Svelte audit / activity log row.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Shape of a single audit / activity log entry displayed by AuditLogRow. */
export interface AuditLogEntry {
  id: string
  /** Actor name or id (React's `ReactNode`: text, or a snippet rendering a node). */
  actor: Snippet | string | number
  /** Verb describing what happened ("updated", "deleted", "assigned"). */
  action: Snippet | string | number
  /** Target object / record. */
  target?: Snippet | string | number
  /** Pre-formatted display timestamp (rendered verbatim — format before passing, e.g. "2 min ago"). */
  timestamp: Snippet | string | number
  /** Optional summary field for delta display — old + new values. */
  oldValue?: Snippet | string | number
  newValue?: Snippet | string | number
  /** Environment / source badge. */
  environment?: Snippet | string | number
  /** Optional trace or correlation id. */
  traceId?: Snippet | string | number
}

/** Props accepted by the {@link AuditLogRow} component. */
export interface AuditLogRowProps {
  /** The entry to display. */
  entry: AuditLogEntry
  /** Called when the row is clicked. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
