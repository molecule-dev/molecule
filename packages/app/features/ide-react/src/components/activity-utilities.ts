/**
 * Pure helpers for dev-capture Activity cards and the Activity panel.
 *
 * The chat handler streams an `activity` SSE event for every captured outbound
 * side effect (email/sms/push/webhook/channel). These helpers turn that event
 * into the bits of UI state the inline card and the panel render — icon glyph,
 * one-line summary, status-pill styling — without any React/DOM dependency so
 * they can be unit-tested in a node environment.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

/** Channel categories a captured activity can belong to. */
export type ActivityType = 'email' | 'sms' | 'push' | 'webhook' | 'channel'

/** Lifecycle status of a captured activity. */
export type ActivityStatus = 'captured' | 'sent' | 'delivered' | 'failed'

/**
 * A single captured activity. Mirrors the SSE `activity.activity` payload; the
 * REST list endpoint additionally returns `payload` and `result` for the
 * expanded detail view.
 */
export interface Activity {
  id: string
  type: ActivityType
  status: ActivityStatus
  recipient?: string
  summary?: string
  /** ISO 8601 timestamp. */
  timestamp: string
  /** Full captured payload — only present on the REST detail response (dev only). */
  payload?: unknown
  /** Provider result / synthetic success record — only present on the REST detail response. */
  result?: unknown
}

/** Emoji glyph per channel type (📧 / 💬 / 🔔 / 🪝 / #). */
const ACTIVITY_ICONS: Record<ActivityType, string> = {
  email: '📧', // 📧
  sms: '💬', // 💬
  push: '🔔', // 🔔
  webhook: '🪝', // 🪝
  channel: '#',
}

/**
 * Returns the icon glyph for an activity type.
 * @param type - The activity channel type.
 * @returns The emoji/glyph string for the type.
 */
export function activityIcon(type: ActivityType): string {
  return ACTIVITY_ICONS[type] ?? ACTIVITY_ICONS.webhook
}

/**
 * Human-readable, translated label for a channel type (used as filter-tab labels).
 * @param type - The activity channel type.
 * @returns The translated channel label.
 */
export function activityTypeLabel(type: ActivityType): string {
  switch (type) {
    case 'email':
      return t('ide.activity.type.email', undefined, { defaultValue: 'Email' })
    case 'sms':
      return t('ide.activity.type.sms', undefined, { defaultValue: 'SMS' })
    case 'push':
      return t('ide.activity.type.push', undefined, { defaultValue: 'Push' })
    case 'webhook':
      return t('ide.activity.type.webhook', undefined, { defaultValue: 'Webhooks' })
    case 'channel':
      return t('ide.activity.type.channel', undefined, { defaultValue: 'Channel' })
    default:
      return type
  }
}

/**
 * Human-readable, translated label for a status (shown in the status pill).
 * @param status - The activity status.
 * @returns The translated status label.
 */
export function activityStatusLabel(status: ActivityStatus): string {
  switch (status) {
    case 'captured':
      return t('ide.activity.status.captured', undefined, { defaultValue: 'Captured' })
    case 'sent':
      return t('ide.activity.status.sent', undefined, { defaultValue: 'Sent' })
    case 'delivered':
      return t('ide.activity.status.delivered', undefined, { defaultValue: 'Delivered' })
    case 'failed':
      return t('ide.activity.status.failed', undefined, { defaultValue: 'Failed' })
    default:
      return status
  }
}

/**
 * Resolves the status-pill colors for a given status. Uses RGBA literals (not
 * ClassMap classes) because these semantic status hues are not part of the
 * surface/text token set — the same approach `VerificationBadge` takes for its
 * pass/fail coloring.
 * @param status - The activity status.
 * @returns An object with `fg` (text) and `bg` (background) CSS color strings.
 */
export function activityStatusColors(status: ActivityStatus): { fg: string; bg: string } {
  switch (status) {
    case 'failed':
      return { fg: '#f85149', bg: 'rgba(248,81,73,0.12)' }
    case 'delivered':
      return { fg: '#3fb950', bg: 'rgba(63,185,80,0.12)' }
    case 'sent':
      return { fg: '#4070e0', bg: 'rgba(64,112,224,0.12)' }
    case 'captured':
    default:
      return { fg: '#d4a017', bg: 'rgba(234,179,8,0.12)' }
  }
}

/**
 * Builds the one-line summary shown on the inline card: the activity's own
 * summary, with the recipient appended after an arrow when present
 * (e.g. `Welcome email → user@example.com`). Falls back to a translated,
 * type-specific default when no summary was captured.
 * @param activity - The activity to summarize.
 * @returns The single-line summary string.
 */
export function activitySummaryLine(
  activity: Pick<Activity, 'type' | 'recipient' | 'summary'>,
): string {
  const base =
    activity.summary?.trim() ||
    t(
      'ide.activity.defaultSummary',
      { type: activityTypeLabel(activity.type) },
      { defaultValue: `${activityTypeLabel(activity.type)} captured` },
    )
  if (activity.recipient?.trim()) {
    return `${base} → ${activity.recipient.trim()}`
  }
  return base
}

/**
 * Maps a raw SSE `activity` event payload into a normalized {@link Activity}.
 * Tolerates missing optional fields and supplies an id/timestamp if absent.
 * @param raw - The `activity` field from the SSE event.
 * @param raw.id - Activity id; generated if absent.
 * @param raw.type - Channel type; defaults to `webhook` if absent.
 * @param raw.status - Lifecycle status; defaults to `captured` if absent.
 * @param raw.recipient - Optional recipient.
 * @param raw.summary - Optional short summary.
 * @param raw.timestamp - ISO timestamp; defaults to now if absent.
 * @returns A normalized Activity object.
 */
export function activityFromEvent(raw: {
  id?: string
  type?: string
  status?: string
  recipient?: string
  summary?: string
  timestamp?: string
}): Activity {
  return {
    id: raw.id ?? (typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Date.now())),
    type: (raw.type as ActivityType) ?? 'webhook',
    status: (raw.status as ActivityStatus) ?? 'captured',
    recipient: raw.recipient,
    summary: raw.summary,
    timestamp: raw.timestamp ?? new Date().toISOString(),
  }
}

/** All channel types, in the order their filter tabs should appear. */
export const ACTIVITY_TYPES: ActivityType[] = ['email', 'sms', 'push', 'webhook', 'channel']

/**
 * Filters a list of activities by channel type. `null` (the "All" tab) returns
 * every activity unchanged.
 * @param activities - The activities to filter.
 * @param type - The channel type to keep, or `null` for all.
 * @returns The filtered list (a new array unless `type` is null).
 */
export function filterActivitiesByType(
  activities: Activity[],
  type: ActivityType | null,
): Activity[] {
  if (!type) return activities
  return activities.filter((a) => a.type === type)
}
