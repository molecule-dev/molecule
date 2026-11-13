/**
 * Amazon Translate provider for molecule.dev.
 *
 * Implements the `@molecule/api-ai-translation` contract (`translate`,
 * `getSupportedLanguages`, `getUsage`) over Amazon Translate's TranslateText
 * API — one text per call, source language auto-detected by default, AWS
 * terminology resources usable as glossaries.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-translation'
 * import { provider } from '@molecule/api-ai-translation-amazon'
 *
 * setProvider(provider) // at startup — lazy; reads AWS_* config on first use
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
 * - Config: `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (required — an IAM key
 *   with `translate:TranslateText`); `AWS_TRANSLATE_REGION` (optional — falls
 *   back to `AWS_REGION`, then `us-east-1`); `AWS_TRANSLATE_ENDPOINT` (optional
 *   endpoint override).
 * - **Language codes are Amazon's**, lowercase BCP-47 style (`de`, `pt`, `zh-TW`)
 *   — not DeepL's (`DE`, `PT-BR`, `ZH-HANT`). Take them from
 *   `getSupportedLanguages()` (the live ListLanguages endpoint).
 * - **Omitting `sourceLang` means `auto`** — Amazon detects the source language
 *   (through Amazon Comprehend), and the detection runs only in regions where
 *   Comprehend exists (us-east-1 qualifies); elsewhere pass `sourceLang`
 *   explicitly.
 * - **`protect` is the only safe way to keep placeholders.** TranslateText has
 *   no tag-handling mode, so this bond sends each protected substring as a
 *   numbered `{{N}}` token — numbers carry no letters a translator could
 *   case-change — and restores the original afterwards. The numbering starts
 *   above any `{{N}}` already in your text, so placeholder-shaped content that
 *   is NOT protected can never collide with the mask.
 * - `formality` maps onto Amazon's `Settings.Formality` (formal/informal are
 *   supported for a subset of target languages — others reject the setting).
 *   `glossaryId` maps onto a custom terminology resource name (create it in
 *   the SAME account/region first — `TerminologyNames`). `preserveFormatting`,
 *   `tagHandling`, `context` and `modelType` are ignored.
 * - **One text per call** — Amazon's TranslateText takes a single string, so an
 *   array input makes one call per text (in order). Per-text cap: 10,000 bytes
 *   of UTF-8, enforced locally before any upstream call.
 * - **`getUsage()` counts this process only** (`characterLimit` is `Infinity`):
 *   Amazon has no usage endpoint — spend lives in the AWS console, billed per
 *   character.
 * - Throttling and transient failures are retried by the AWS SDK's own retry
 *   strategy; everything else throws (tracked through `trackBondFailure`).
 * - On hosts whose egress path is an HTTP proxy the SDK's agent is set from
 *   `@molecule/api-proxy-agent` automatically; the AWS SDK otherwise ignores
 *   proxy variables entirely.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './protect.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
