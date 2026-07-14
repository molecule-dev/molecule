/**
 * AI model catalog resource.
 *
 * Server-side source of truth for available AI models plus an
 * authentication-gated discovery endpoint (`GET /ai/models`). Server consumers
 * (chat handler, compaction) import `MODELS` / `getModel` / `MODEL_IDS`
 * directly; authenticated clients fetch the filtered projection over HTTP. The
 * `list` handler enforces the session check itself and fails closed with `401`,
 * so the configured-model catalog is never disclosed to an unauthenticated
 * caller even if the route's `'authenticate'` middleware is stripped by codegen.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './handlers/index.js'
export * from './lookup.js'
export * from './models.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
