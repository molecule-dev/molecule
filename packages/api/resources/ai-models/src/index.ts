/**
 * AI model catalog resource.
 *
 * Server-side source of truth for available AI models plus a public discovery
 * endpoint (`GET /ai/models`). Server consumers (chat handler, compaction)
 * import `MODELS` / `getModel` / `MODEL_IDS` directly; clients fetch the
 * filtered public projection over HTTP.
 *
 * @module
 */

export * from './handlers/index.js'
export * from './lookup.js'
export * from './models.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
