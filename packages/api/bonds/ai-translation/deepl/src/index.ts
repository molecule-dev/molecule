/**
 * DeepL translation provider for molecule.dev.
 *
 * Implements the full `@molecule/api-ai-translation` contract (`translate`,
 * `getSupportedLanguages`, `getUsage`) over the DeepL REST API, auto-batching
 * large inputs (50 texts per request, DeepL's limit).
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-translation'
 * import { createProvider } from '@molecule/api-ai-translation-deepl'
 *
 * // Startup (server only): the key comes from the server env (free keys end in `:fx`).
 * setProvider(createProvider({ apiKey: process.env.DEEPL_API_KEY }))
 *
 * // One call for many strings; results come back in input order.
 * const { translations } = await requireProvider().translate({
 *   text: ['Hello, world!', 'Your order shipped.'],
 *   targetLang: 'DE',
 *   formality: 'more', // optional: formal "Sie"
 * })
 * console.log(translations.map((t) => t.text)) // ['Hallo, Welt!', 'Ihre Bestellung wurde versandt.']
 * console.log(translations[0]?.detectedSourceLang) // 'EN'
 * ```
 *
 * @remarks
 * - **Wiring**: bond once at startup with the core's `setProvider(createProvider({...}))`
 *   (equivalent to `bond('ai-translation', …)`); the lazy `provider` export also works
 *   (`setProvider(provider)`) and reads `DEEPL_API_KEY` on first use. Importing this package
 *   wires nothing by itself.
 * - Config: `DEEPL_API_KEY` (required, SERVER-side only; free keys end in `:fx` and
 *   auto-route to `https://api-free.deepl.com`, pro keys to `https://api.deepl.com`);
 *   `DEEPL_BASE_URL` (optional) overrides the endpoint outright — it deliberately wins over
 *   the key-shape heuristic so credential brokers/gateways work with either key type. A
 *   missing key does NOT fail fast — the call throws `DeepL translate API error: …` (403).
 * - `translate()` ALWAYS returns `{ translations: [...] }` — an array even for a single
 *   string input; there is no `result.text`. Language codes are DeepL's (`DE`, `EN-US`,
 *   `PT-BR`), passed through verbatim — prefer `EN-US`/`EN-GB` and `PT-BR`/`PT-PT` over the
 *   deprecated bare `EN`/`PT` targets.
 * - `formality` is only honoured for target languages that support it (see
 *   `getSupportedLanguages('target')` → `supportsFormality`); DeepL rejects it otherwise
 *   unless you use the `prefer_more`/`prefer_less` variants.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
