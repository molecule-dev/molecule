/**
 * Body parser middleware for molecule.dev.
 *
 * Core interface — the actual implementation is provided via bonds.
 * Install a body parser bond (e.g., `@molecule/api-middleware-body-parser-express`)
 * to provide JSON and multipart form data parsing.
 *
 * @remarks
 * - **Always set a `limit`** ({@link JsonParserOptions}`.limit`, e.g. `'1mb'`). An unbounded
 *   body lets a client exhaust memory (DoS) — pick a cap that fits your largest legit payload.
 * - **Provider webhooks need the RAW body — mount their route BEFORE the JSON parser.** A JSON
 *   parser consumes + rewrites the body, which breaks signature verification (Stripe's
 *   `constructEvent` and friends hash the exact bytes). Give the webhook route
 *   `express.raw(...)` (or capture `req.rawBody`) and register it before the global JSON body
 *   parser. See `@molecule/api-payments-stripe`.
 *
 * @example
 * ```ts
 * import { createJsonParser } from '@molecule/api-middleware-body-parser'
 * // Webhook route FIRST, with a raw parser, so signature verification sees the exact bytes.
 * app.post('/api/users/payment-notification/stripe',
 *   express.raw({ type: 'application/json' }), stripeWebhookHandler)
 * // Then the global JSON parser (bounded) for everything else.
 * app.use(createJsonParser({ limit: '1mb' }))
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './parser.js'
