/**
 * Notification preferences business logic service.
 *
 * Single-row-per-user JSONB store with default-on semantics. All persistence
 * goes through the abstract `@molecule/api-database` DataStore so the resource
 * stays database-agnostic.
 *
 * @module
 */

import { create as dbCreate, findOne, updateMany } from '@molecule/api-database'

import type {
  NotificationChannel,
  NotificationChannelToggles,
  NotificationPreferences,
  NotificationPreferencesPatch,
  NotificationPreferencesRow,
  NotificationType,
} from './types.js'

const TABLE = 'notifications_preferences'

/**
 * Returns a fresh "all-on" toggle record. Channel defaults are `true`, matching
 * the package-wide default-on policy used by `isEnabled()`.
 *
 * @returns A new toggles object with every channel enabled.
 */
function defaultToggles(): NotificationChannelToggles {
  return { email: true, push: true, sms: true, inApp: true }
}

/**
 * Retrieves the stored preferences map for a user.
 *
 * If no row exists yet, returns an empty map (`{}`). Callers should treat
 * missing entries as "all channels enabled" — use `isEnabled()` rather than
 * inspecting this map directly when gating delivery.
 *
 * @param userId - The user to look up.
 * @returns The user's stored preferences map, or `{}` if no row exists.
 */
export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  const row = await findOne<NotificationPreferencesRow>(TABLE, [
    { field: 'userId', operator: '=', value: userId },
  ])
  return row?.preferences ?? {}
}

/**
 * Applies a partial update to the user's preferences map.
 *
 * Performs a per-type, per-channel deep merge: keys present in `patch`
 * overwrite their counterparts in storage; keys absent from `patch` are
 * preserved. Creates the row on first call if none exists.
 *
 * @param userId - The user whose preferences should be updated.
 * @param patch - Partial type→channel-toggle overrides to merge in.
 * @returns The fully-merged preferences map after the update.
 */
export async function updatePreferences(
  userId: string,
  patch: NotificationPreferencesPatch,
): Promise<NotificationPreferences> {
  const existing = await findOne<NotificationPreferencesRow>(TABLE, [
    { field: 'userId', operator: '=', value: userId },
  ])

  const current: NotificationPreferences = existing?.preferences ?? {}
  const merged: NotificationPreferences = { ...current }

  for (const [type, partial] of Object.entries(patch)) {
    const base = merged[type] ?? defaultToggles()
    merged[type] = { ...base, ...partial }
  }

  if (existing) {
    await updateMany(TABLE, [{ field: 'userId', operator: '=', value: userId }], {
      preferences: merged,
    })
  } else {
    await dbCreate<NotificationPreferencesRow>(TABLE, {
      userId,
      preferences: merged,
    })
  }

  return merged
}

/**
 * Resolves whether a specific channel is enabled for a specific notification
 * type for a user.
 *
 * Default-on policy: returns `true` when no row exists, when the type has no
 * stored entry, or when the channel field is missing from the entry. Callers
 * should use this as the authoritative delivery gate.
 *
 * @param userId - The user to check.
 * @param type - The notification-type slug.
 * @param channel - The delivery channel.
 * @returns `true` if delivery is allowed, `false` if explicitly disabled.
 */
export async function isEnabled(
  userId: string,
  type: NotificationType,
  channel: NotificationChannel,
): Promise<boolean> {
  const row = await findOne<NotificationPreferencesRow>(TABLE, [
    { field: 'userId', operator: '=', value: userId },
  ])
  if (!row) return true

  const toggles = row.preferences?.[type]
  if (!toggles) return true

  const value = toggles[channel]
  return value === undefined ? true : value
}
