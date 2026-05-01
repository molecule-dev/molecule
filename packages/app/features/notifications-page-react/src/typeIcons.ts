/**
 * Default `Notification.type → material-symbol` icon mapping for
 * `<NotificationsPage>`. Extend or replace via the `typeIcons` prop.
 *
 * @module
 */

import type { NotificationsPageTypeIconMap } from './types.js'

/**
 * Default mapping covering the most common notification types.
 *
 * Unknown types fall back to `notifications` at render time.
 */
export const DEFAULT_TYPE_ICONS: NotificationsPageTypeIconMap = {
  system: 'campaign',
  message: 'chat',
  mention: 'alternate_email',
  alert: 'priority_high',
  reminder: 'schedule',
  comment: 'mode_comment',
  follow: 'person_add',
  like: 'favorite',
  invite: 'mail',
  payment: 'payments',
  shipment: 'local_shipping',
  status: 'info',
}

/**
 * Resolve an icon name for the given notification type, applying caller
 * overrides on top of the default map and falling back to a generic
 * bell glyph when the type is unknown.
 *
 * @param type - The `Notification.type` value (e.g. `'message'`).
 * @param overrides - Optional caller-provided overrides.
 * @returns The material-symbol icon name to render.
 */
export function resolveTypeIcon(type: string, overrides?: NotificationsPageTypeIconMap): string {
  if (overrides && type in overrides) return overrides[type]!
  if (type in DEFAULT_TYPE_ICONS) return DEFAULT_TYPE_ICONS[type]!
  return 'notifications'
}
