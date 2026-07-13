/**
 * Default notification center provider for molecule.dev.
 *
 * Implements `NotificationCenterProvider` from `@molecule/app-notification-center`
 * using pure TypeScript in-memory state management with support for polling,
 * realtime push updates, and subscription-based state notifications.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-notification-center-default'
 * import { setProvider } from '@molecule/app-notification-center'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * `poll()`, `loadMore()`, and `refresh()` all catch their own fetch
 * failures — the in-memory list is never wiped and the loop/promise chain
 * never throws — but the failure is not silently discarded: it is captured
 * into `NotificationCenterState.lastError` (cleared back to `undefined` on
 * the next successful call of that same method) and emitted to subscribers,
 * so a UI consumer can render a retry affordance even while a
 * stale-but-populated list continues to display.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
