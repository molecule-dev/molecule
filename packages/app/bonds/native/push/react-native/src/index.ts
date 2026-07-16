/**
 * React Native push notifications provider for molecule.dev.
 *
 * Implements the `PushProvider` interface from `@molecule/app-push` using
 * `expo-notifications`: permission flow, Expo push-token registration,
 * foreground/action listeners, local notifications, and badge management.
 *
 * @example
 * ```typescript
 * import { setProvider, requestPermission, register } from '@molecule/app-push'
 * import { provider } from '@molecule/app-push-react-native'
 *
 * // Wire BEFORE anything touches the push bond (see remarks).
 * setProvider(provider)
 *
 * // iOS requires permission before a token can be issued.
 * const status = await requestPermission()
 * if (status === 'granted') {
 *   const token = await register()
 *   // token.value is an EXPO push token ("ExponentPushToken[…]") — send it to
 *   // your API and deliver pushes via Expo's Push HTTP API.
 * }
 * ```
 *
 * @remarks
 * - **Call `setProvider(provider)` before ANY push call.** `@molecule/app-push`'s
 *   `getProvider()` silently auto-bonds a WEB push provider when nothing is bonded —
 *   in React Native that fails at runtime with service-worker errors instead of a
 *   clear "no provider" message.
 * - **Tokens are Expo push tokens, not raw FCM/APNs device tokens.** The server must
 *   send through Expo's Push API (`https://exp.host/--/api/v2/push/send`); an
 *   FCM/APNs sender cannot deliver to an `ExponentPushToken[…]`.
 * - **Standalone/EAS builds need an EAS `projectId`** for token registration
 *   (Expo SDK 49+ throws without one outside Expo Go) — configure it in `app.json`
 *   (`extra.eas.projectId`).
 * - `expo-notifications` is a peer dependency loaded on demand — install it with
 *   `npx expo install expo-notifications`.
 * - With `handleForeground: true` (default), the global foreground-display handler
 *   is installed when `onNotificationReceived()` is first subscribed — subscribe
 *   early (app root) if foreground alerts should always show.
 * - `unregister()` only clears the locally cached token; it does not invalidate the
 *   token with Expo/APNs/FCM.
 *
 * @module @molecule/app-push-react-native
 */

export * from './provider.js'
export * from './types.js'
