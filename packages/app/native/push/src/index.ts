/**
 * Client-side push notifications interface for molecule.dev.
 *
 * Provides a unified API for push notifications across platforms (web,
 * native containers, etc.): permission flow (`checkPermission`,
 * `requestPermission`), registration (`register`, `getToken`), incoming
 * events (`onNotificationReceived`, `onNotificationAction`), local
 * notifications (`scheduleLocal`), and badges (`setBadge`, `clearBadge`).
 * The device token is what your API's `@molecule/api-push-notifications`
 * bond sends to.
 *
 * @example
 * ```typescript
 * import {
 *   getToken,
 *   onNotificationAction,
 *   register,
 *   requestPermission,
 * } from '@molecule/app-push'
 *
 * async function enablePush(vapidPublicKey: string): Promise<string | null> {
 *   const permission = await requestPermission() // from a user gesture
 *   if (permission !== 'granted') return null
 *   const token = await register({ vapidPublicKey })
 *   // POST token.value to your API so api-push-notifications can target it
 *   return token.value
 * }
 *
 * function handleTaps(open: (data: unknown) => void): () => void {
 *   return onNotificationAction((event) => open(event.notification.data))
 * }
 * ```
 *
 * @remarks
 * - **No wiring is needed on web**: the first accessor call silently bonds
 *   the built-in Web Push provider. In a native app wire
 *   `@molecule/app-push-react-native` (the one prebuilt bond) via
 *   `setProvider()` BEFORE any push call — otherwise the web fallback gets
 *   bonded and native registration never happens.
 * - **Web `register()` has three hard prerequisites**: (1) HTTPS (secure
 *   context), (2) a registered SERVICE WORKER — dev builds typically don't
 *   ship one, so register() throws "requires the production app build"
 *   (it fails fast instead of hanging), and (3) a VAPID public key
 *   (pass via `register({ vapidPublicKey })`) matching your API's
 *   `VAPID_PRIVATE_KEY` — without it Chrome may register but delivery
 *   fails.
 * - **Request permission from a user gesture at the point of value**, never
 *   on load — a denied browser prompt is remembered forever (no re-prompt).
 * - Web `scheduleLocal` at a future time uses an in-page timer: it does NOT
 *   survive reload/close. Web `cancelLocal`/`cancelAllLocal` are no-ops,
 *   and `getPendingLocal()` is always empty — for reliable scheduled
 *   delivery send a real push from the server.
 * - `token.value` on web is a JSON-serialized PushSubscription (not an FCM
 *   token) — store it opaquely; platform is in `token.platform`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './web-provider.js'
