/**
 * App-side AI model catalog client.
 *
 * Framework-agnostic loader, types, and UI-only constants (`PROVIDER_BRAND_COLORS`,
 * `formatTokenCount`, effort helpers). Hosts the lazy fetch of `GET /ai/models`.
 * Framework bindings (e.g. `useAIModels` in `@molecule/app-react`) wrap this loader.
 *
 * @remarks
 * - **The server side is `@molecule/api-resource-ai-models`** — it serves the
 *   auth-gated `GET /ai/models` route this loader calls. Without that resource (or
 *   an equivalent route returning `ListAIModelsResponse`), `loadAIModels` fails.
 *   The route is session-gated: fetch with the app's authenticated HTTP client.
 * - `loadAIModels` does NOT cache — call it once and keep the result (the
 *   framework hook does this for you). Use `pickFreeTierModel` /
 *   `partitionByDeprecation` instead of re-deriving tier/deprecation logic;
 *   `disabled` models must never surface in a picker.
 *
 * @example
 * ```typescript
 * import {
 *   formatTokenCount,
 *   loadAIModels,
 *   partitionByDeprecation,
 *   pickFreeTierModel,
 * } from '@molecule/app-ai-models'
 * import { createFetchClient, getClient, setClient } from '@molecule/app-http'
 *
 * // Startup: bond the app's HTTP client (base URL of YOUR API) and attach the session.
 * setClient(createFetchClient({ baseURL: 'https://api.example.com' }))
 * const sessionToken = 'user-session-jwt'
 * getClient().setAuthToken(sessionToken) // GET /ai/models is session-gated
 *
 * // Load once and keep the result — this loader does not cache.
 * const models = await loadAIModels(getClient())
 * const { current, deprecated } = partitionByDeprecation(models) // drops disabled/superseded
 * const selected = pickFreeTierModel(models) ?? current[0]
 * const options = current.map((m) => `${m.label} · ${formatTokenCount(m.contextWindow)}`)
 * console.log(selected?.id, options, deprecated.length) // e.g. 'Sonnet · 200K'
 * ```
 *
 * @module
 */

export * from './colors.js'
export * from './effort.js'
export * from './format.js'
export * from './load.js'
export * from './types.js'
