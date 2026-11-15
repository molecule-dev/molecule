/**
 * Types for the Angular audit / activity log row.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * A node-valued entry field (React's `ReactNode`): in Angular a field is text
 * (a string or number) or an `ng-template` reference rendered through
 * `NgTemplateOutlet` where the node would render.
 */
type AuditLogEntryNode = TemplateRef<unknown> | string | number

/** Shape of a single audit / activity log entry displayed by AuditLogRow. */
export interface AuditLogEntry {
  id: string
  /** Actor name or id. */
  actor: AuditLogEntryNode
  /** Verb describing what happened ("updated", "deleted", "assigned"). */
  action: AuditLogEntryNode
  /** Target object / record. */
  target?: AuditLogEntryNode
  /** Pre-formatted display timestamp (rendered verbatim — format before passing, e.g. "2 min ago"). */
  timestamp: AuditLogEntryNode
  /** Optional summary field for delta display — old + new values. */
  oldValue?: AuditLogEntryNode
  newValue?: AuditLogEntryNode
  /** Environment / source badge. */
  environment?: AuditLogEntryNode
  /** Optional trace or correlation id. */
  traceId?: AuditLogEntryNode
}

/** Props accepted by the {@link AuditLogRow} component. */
export interface AuditLogRowProps {
  /** The entry to display. */
  entry: AuditLogEntry
  /** Called when the row is clicked (and on Enter / Space when interactive). */
  onClick?: (event?: Event) => void
  /** Extra classes. */
  className?: string
}
