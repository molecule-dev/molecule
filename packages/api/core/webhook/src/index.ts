/**
 * Webhook core interface for molecule.dev.
 *
 * Defines the standard interface for webhook dispatch providers
 * (HTTP, queue-backed, etc.).
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, register, dispatch } from '@molecule/api-webhook'
 *
 * // Bond a provider at startup
 * setProvider(httpWebhookProvider)
 *
 * // Register an endpoint
 * const hook = await register('https://example.com/hook', ['order.created'])
 *
 * // Dispatch an event
 * const results = await dispatch('order.created', { orderId: '123' })
 * console.log(results[0].success) // true
 * ```
 */

export * from './provider.js'
export * from './types.js'
export * from './webhook.js'
