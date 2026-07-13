/**
 * Push notification capture provider for molecule.dev.
 *
 * Records every `send()` / `sendMany()` call as an activity event.
 * Intercept-only by default; delegates + tees when wrapping a real provider.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-push-notifications'
 * import { provider } from '@molecule/api-push-capture'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * In intercept-only mode (no `realProvider`), `generateVapidKeys()` THROWS —
 * there is no real push transport behind it to generate real keys with.
 * Wrap a real provider (`createPushCaptureProvider(realProvider)`) to
 * delegate key generation, or generate VAPID keys once with a real provider
 * (e.g. `@molecule/api-push-notifications-web-push`'s `generateVapidKeys()`)
 * and set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`. `getPublicKey()` is
 * unaffected — it honestly falls back to the `VAPID_PUBLIC_KEY` env var so
 * the enable-push UI keeps working in capture mode even though sends stay
 * captured.
 *
 * @module
 */

export * from './provider.js'
