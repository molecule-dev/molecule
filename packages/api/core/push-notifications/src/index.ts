/**
 * Push notification provider interface for molecule.dev.
 *
 * Provides an abstract push notification interface that can be backed by any
 * push notification library. Use `setProvider` to bond a concrete implementation
 * such as `@molecule/api-push-notifications-web-push`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
