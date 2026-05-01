/**
 * Subscriber resource for molecule.dev.
 *
 * Tokenized email/sms/webhook subscriber records with confirm/unsubscribe links.
 * Designed for status-page-style "subscribe to incident updates" and newsletter
 * signup flows. A subscriber is created in `pending` status and confirmed via a
 * one-time token; opt-out is one-click via a separate unsubscribe token. Both
 * tokens are returned exactly once on creation and are never exposed via the
 * public listing/read endpoints.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-subscriber'
 *
 * for (const route of routes) {
 *   app[route.method](route.path, requestHandlerMap[route.handler])
 * }
 * ```
 */

export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
export * from './utilities.js'
