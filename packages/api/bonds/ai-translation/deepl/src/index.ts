/**
 * DeepL translation provider for molecule.dev.
 *
 * Implements the full `@molecule/api-ai-translation` contract (`translate`,
 * `getSupportedLanguages`, `getUsage`) over the DeepL REST API, auto-batching
 * large inputs (50 texts per request, DeepL's limit).
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-translation'
 * import { createProvider } from '@molecule/api-ai-translation-deepl'
 *
 * // This bond exports NO `provider` const — wire the factory (reads DEEPL_API_KEY):
 * setProvider(createProvider())
 *
 * const { translations } = await requireProvider().translate({
 *   text: 'Hello, world!',
 *   targetLang: 'DE',
 * })
 * ```
 *
 * @remarks
 * - **Wiring**: no lazy `provider` export — call `setProvider(createProvider(config?))`.
 *   Use the core's `setProvider`, NOT `bond('ai-translation', …)`.
 * - Config: `DEEPL_API_KEY` (required; free keys end in `:fx` and auto-route to
 *   `https://api-free.deepl.com`, pro keys to `https://api.deepl.com`); `DEEPL_BASE_URL`
 *   (optional) overrides the endpoint outright — it deliberately wins over the key-shape
 *   heuristic so credential brokers/gateways work with either key type.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
