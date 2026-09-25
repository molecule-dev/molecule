/**
 * Self-hosted translation provider for molecule.dev, built on Mozilla's Firefox
 * Translations (Bergamot) models.
 *
 * Implements the `@molecule/api-ai-translation` contract by running the same
 * small translation models Firefox uses, in-process, on the CPU, through the
 * Bergamot WASM runtime. No API key, no per-character cost, no Python, no GPU;
 * after the first download no text leaves the host.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-translation'
 * import { createProvider } from '@molecule/api-ai-translation-bergamot'
 *
 * // Models download into cacheDir on first use (20–50 MB per language pair).
 * setProvider(createProvider({ cacheDir: '/var/cache/bergamot', workers: 4 }))
 *
 * const { translations } = await requireProvider().translate({
 *   text: ['{{count}} items in your cart', 'Checkout'],
 *   sourceLang: 'en',
 *   targetLang: 'de',
 *   protect: ['{{count}}'],
 * })
 * ```
 *
 * @remarks
 * - **Languages: English to and from 53 languages** (September 2026) — the pairs Firefox
 *   publishes for desktop release builds; `getSupportedLanguages('target')` lists them
 *   from the live model list. Any other pair, e.g. German→Japanese, goes through English
 *   in one call. **No English→X model** exists for Albanian, Amharic, Armenian,
 *   Belarusian, Burmese, Filipino, Georgian, Hausa, Igbo, Irish, Kazakh, Khmer, Kyrgyz,
 *   Lao, Macedonian, Maltese, Mongolian, Nepali, Punjabi, Sinhala, Swahili, Uzbek, Welsh,
 *   Yoruba or Zulu: those throw an error with `code: 'UNSUPPORTED_LANGUAGE_PAIR'` — route
 *   them to another provider (e.g. `@molecule/api-ai-translation-madlad` or `-llm`).
 * - **`sourceLang` defaults to English** — there is no language detection. Codes are
 *   normalised (`DE`, `pt-BR`, `es-MX`, `zh-TW`, `no` all work; Chinese maps to the
 *   `zh-Hans` / `zh-Hant` models).
 * - **`protect` placeholders** go out as `⟦N⟧` tokens and are restored by index. A text
 *   whose tokens do not all survive is translated again in Bergamot's HTML mode, which
 *   never drops a tag; the spacing around it is then rebuilt from the source. Still
 *   **check every result before storing it** — the model may move a placeholder to a
 *   grammatically odd spot.
 * - **First call downloads**: the model list, a 5 MB runtime (`bergamot-translator` v0.6.0,
 *   SHA-256 pinned), and each pair's files (hash-checked) into `cacheDir`
 *   (`BERGAMOT_CACHE_DIR`, default `~/.cache/molecule/bergamot`). Put it on a persistent
 *   volume. For hosts without internet, copy the cache directory, or pass `wasmPath` +
 *   `gluePath` and mirror the model list with `recordsUrl` / `attachmentsUrl`.
 * - **Speed and memory**: each language pair gets its own worker threads (`workers`,
 *   `BERGAMOT_WORKERS`, default 1), each holding the runtime and that pair's model(s) —
 *   roughly 100–250 MB per worker; up to `maxLoadedPairs` pairs (default 4) stay loaded.
 *   More workers split a large batch across CPU cores.
 * - `formality`, `glossaryId`, `context`, `modelType` and `preserveFormatting` have no
 *   Bergamot equivalent and are ignored. `tagHandling` ('html' or 'xml') keeps the
 *   text's own tags.
 * - Licences: the models and the runtime are Mozilla's, MPL-2.0 (fine for commercial
 *   use; they are downloaded, not bundled). Quality is below Google/DeepL (Mozilla's
 *   COMET22 0.870 vs Google 0.902 on the same test set) — spot-check what matters.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './engine.js'
export * from './languages.js'
export * from './protect.js'
export * from './provider.js'
export * from './registry.js'
export * from './types.js'
