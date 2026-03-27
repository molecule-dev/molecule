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
 * @module
 */

export * from './provider.js'
export * from './types.js'
