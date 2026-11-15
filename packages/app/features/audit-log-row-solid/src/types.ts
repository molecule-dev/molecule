/**
 * Types for the Solid audit / activity log row.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Shape of a single audit / activity log entry displayed by AuditLogRow. */
export interface AuditLogEntry {
  id: string
  /** Actor name or id (React's `ReactNode`: any Solid JSX element). */
  actor: JSX.Element
  /** Verb describing what happened ("updated", "deleted", "assigned"). */
  action: JSX.Element
  /** Target object / record. */
  target?: JSX.Element
  /** Pre-formatted display timestamp (rendered verbatim — format before passing, e.g. "2 min ago"). */
  timestamp: JSX.Element
  /** Optional summary field for delta display — old + new values. */
  oldValue?: JSX.Element
  newValue?: JSX.Element
  /** Environment / source badge. */
  environment?: JSX.Element
  /** Optional trace or correlation id. */
  traceId?: JSX.Element
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
