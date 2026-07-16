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
 * import { getClient } from '@molecule/app-http'
 * import { loadAIModels, partitionByDeprecation } from '@molecule/app-ai-models'
 *
 * const models = await loadAIModels(getClient())
 * const { current, deprecated } = partitionByDeprecation(models)
 * ```
 *
 * @module
 */

export * from './colors.js'
export * from './effort.js'
export * from './format.js'
export * from './load.js'
export * from './types.js'
