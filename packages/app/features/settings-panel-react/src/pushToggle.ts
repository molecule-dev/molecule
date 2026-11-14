/**
 * The current-device push toggle behind {@link NotificationsSection}: the
 * full enable/disable chain — permission → runtime VAPID key fetch →
 * subscribe → persist on the device row. It lives in `@molecule/app-push`
 * (`device-toggle.ts`, with the server contract) so every framework's
 * settings panel runs the same functions; this package re-exports them.
 *
 * @module
 */

export type {
  PushToggleDevice,
  PushToggleFailureReason,
  PushToggleHttp,
  PushToggleResult,
  PushToggleToken,
} from '@molecule/app-push'
export {
  disablePushOnCurrentDevice,
  enablePushOnCurrentDevice,
  findCurrentDevice,
  readCurrentDevicePushEnabled,
  subscriptionFromToken,
} from '@molecule/app-push'
