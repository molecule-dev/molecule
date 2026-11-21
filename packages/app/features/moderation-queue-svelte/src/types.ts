/**
 * Types of `@molecule/app-moderation-queue-svelte` — the Svelte counterpart of
 * `@molecule/app-moderation-queue-react`, same props (React names) and DOM.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * Kind of content awaiting moderation. Drives the leading icon glyph
 * and the row's `data-mol-kind` attribute used by tests + AI agents.
 */
export type ModerationItemKind = 'post' | 'comment' | 'image' | 'message' | 'profile'

/**
 * Severity assigned to a flagged item, used to color the severity chip.
 * Maps to `ColorVariant`: low→info, medium→warning, high→error.
 */
export type ModerationItemSeverity = 'low' | 'medium' | 'high'

/**
 * One flagged item awaiting moderator review.
 */
export interface ModerationItem {
  /** Unique id used for selection + action callbacks (the row's render key). */
  id: string
  /** Content kind, drives icon + kind label. */
  kind: ModerationItemKind
  /** Pre-rendered preview slot (usually the offending content). */
  preview: Snippet | string
  /** Reason the item was flagged. Free-form string or pre-rendered snippet. */
  reason: Snippet | string
  /** Display name / id of the reporter, optional. */
  reportedBy?: Snippet | string
  /** When the report was filed (string or pre-formatted snippet). */
  reportedAt: Snippet | string
  /** Severity — colors the severity chip. */
  severity?: ModerationItemSeverity
}

/**
 * Bulk action a moderator can apply to selected ids.
 */
export type ModerationBulkAction = 'approve' | 'reject' | 'escalate' | 'mute'

/**
 * Props accepted by the {@link ModerationQueue} component — the same props
 * `@molecule/app-moderation-queue-react` accepts.
 */
export interface ModerationQueueProps {
  /** Flagged items to display. */
  items: ModerationItem[]
  /** Approve the item — content is allowed / kept. */
  onApprove: (id: string) => void
  /** Reject the item — content is removed / hidden. */
  onReject: (id: string) => void
  /** Escalate to a senior moderator / human review. Optional. */
  onEscalate?: (id: string) => void
  /** Mute the reporter / poster. Optional. */
  onMute?: (id: string) => void
  /** Apply an action to the currently-selected ids, if bulk select is in use. */
  onBulkAction?: (action: ModerationBulkAction, ids: string[]) => void
  /** Loading state — replaces the list with a spinner row. */
  loading?: boolean
  /** Empty-state slot rendered when `items` is empty and `loading` is false. */
  emptyState?: Snippet | string
  /** Extra classes for the outer container. */
  className?: string
}
