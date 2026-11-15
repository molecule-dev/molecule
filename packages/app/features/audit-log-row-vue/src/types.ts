/**
 * Types for the Vue audit / activity log row.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Shape of a single audit / activity log entry displayed by AuditLogRow. */
export interface AuditLogEntry {
  id: string
  /** Actor name or id (React's `ReactNode`: any Vue node child). */
  actor: VNodeChild
  /** Verb describing what happened ("updated", "deleted", "assigned"). */
  action: VNodeChild
  /** Target object / record. */
  target?: VNodeChild
  /** Pre-formatted display timestamp (rendered verbatim — format before passing, e.g. "2 min ago"). */
  timestamp: VNodeChild
  /** Optional summary field for delta display — old + new values. */
  oldValue?: VNodeChild
  newValue?: VNodeChild
  /** Environment / source badge. */
  environment?: VNodeChild
  /** Optional trace or correlation id. */
  traceId?: VNodeChild
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
