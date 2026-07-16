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
 * @example
 * ```typescript
 * import { getModel, MODEL_IDS } from '@molecule/api-resource-ai-models'
 *
 * // Server-side validation of a client-selected model id:
 * if (!MODEL_IDS.has(requestedId)) {
 *   throw new Error('Unknown or retired model')
 * }
 * const model = getModel(requestedId)! // full definition (pricing, effort levels)
 * ```
 *
 * @remarks
 * - **No database, no migration — the catalog is code.** Add/retire models by
 *   editing `models.ts`; validation (`MODEL_IDS`) and the discovery endpoint
 *   update automatically.
 * - **`GET /ai/models` only lists models whose provider is BONDED.** The handler
 *   intersects `MODELS` with the names registered under the `'ai'` bond category,
 *   so `bond('ai', '<name>', provider)` names must equal
 *   `ModelDefinition.provider` ids. An empty `{ models: [] }` response means no
 *   AI bond is wired — fix the wiring; never hardcode a model list client-side.
 * - **Disabled models stay resolvable on purpose.** `getModel(id)` returns
 *   retired models so historical usage still prices correctly; gate what a user
 *   may SELECT with `MODEL_IDS` / `getAvailableModels()`, never with `getModel()`.
 * - The list handler enforces authentication in-handler (fails closed 401) — if
 *   you fork it, keep that check; route middleware alone can be stripped by
 *   codegen.
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
