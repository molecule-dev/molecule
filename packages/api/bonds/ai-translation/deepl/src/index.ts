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
 * import { provider } from '@molecule/api-ai-translation-deepl'
 *
 * setProvider(provider) // at startup — lazy; reads DEEPL_API_KEY on first use
 *
 * const { translations } = await requireProvider().translate({
 *   text: 'Hello, world!',
 *   targetLang: 'DE',
 * })
 * ```
 *
 * @remarks
 * - **Wiring**: bond the lazy `provider` export once — `setProvider(provider)` — or
 *   `setProvider(createProvider(config?))` to pass explicit config. Use the core's
 *   `setProvider`, NOT `bond('ai-translation', …)`.
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
