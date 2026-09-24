/**
 * Google Cloud Translation provider for molecule.dev.
 *
 * Implements the `@molecule/api-ai-translation` contract (`translate`,
 * `getSupportedLanguages`, `getUsage`) over the Cloud Translation API (Basic,
 * v2), batching large inputs (128 texts or ~25k characters per request).
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-translation'
 * import { provider } from '@molecule/api-ai-translation-google'
 *
 * setProvider(provider) // at startup — lazy; reads GOOGLE_TRANSLATE_API_KEY on first use
 *
 * const { translations } = await requireProvider().translate({
 *   text: ['{{count}} items in your cart'],
 *   targetLang: 'de',
 *   protect: ['{{count}}'],
 * })
 * // translations[0].text → '{{count}} Artikel in Ihrem Warenkorb'
 * ```
 *
 * @remarks
 * - **Wiring**: bond the lazy `provider` export once — `setProvider(provider)` — or
 *   `setProvider(createProvider(config?))` to pass explicit config.
 * - Config: `GOOGLE_TRANSLATE_API_KEY` (required — a Google Cloud API key with the
 *   Cloud Translation API enabled); `GOOGLE_TRANSLATE_BASE_URL` (optional endpoint override).
 * - **Language codes are Google's**, lowercase BCP-47 style (`de`, `pt`, `zh-TW`) —
 *   not DeepL's (`DE`, `PT-BR`, `ZH-HANT`). Take them from `getSupportedLanguages()`.
 * - **`protect` is the only safe way to keep placeholders.** Google ignores custom
 *   tags and splits braces even inside `translate="no"`, so this bond sends each
 *   protected substring as an index and restores the original afterwards.
 * - `formality`, `glossaryId`, `modelType`, `context` and `preserveFormatting` have no
 *   v2 equivalent and are ignored.
 * - **`getUsage()` counts this process only** (`characterLimit` is `Infinity`): Google
 *   has no usage endpoint — spend lives in the Cloud console, billed per character.
 * - Rate limits (429, and 403 "User Rate Limit Exceeded") and 5xx are retried with
 *   backoff; other failures throw an `Error` whose `status` is the HTTP status.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
