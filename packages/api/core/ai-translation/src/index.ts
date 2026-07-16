/**
 * AI text-translation core interface for molecule.dev.
 *
 * Defines the `AITranslationProvider` contract — translate text between
 * languages (`translate`), list supported languages, and read billing-period
 * usage — plus the accessor (`setProvider`/`getProvider`/`hasProvider`/
 * `requireProvider`). Interface-only: bond a provider package (e.g.
 * `@molecule/api-ai-translation-deepl`).
 *
 * @remarks
 * - **Wire it with THIS package's `setProvider()` — NOT `bond('ai-translation', …)`.**
 *   This core keeps its own singleton and does not read the `@molecule/api-bond`
 *   registry: a generic `bond(...)` call appears to succeed, but `requireProvider()`
 *   still throws at first use. Call `setProvider(...)` in the app's bond setup.
 * - **This translates CONTENT, not the UI.** App chrome/labels stay on the i18n
 *   system (`t(key, values, { defaultValue })` + locale bonds); use this bond for
 *   user-generated or dynamic text.
 * - **Language codes are provider-flavored** and regional variants matter on the
 *   target side (e.g. 'EN-US' vs 'EN', 'PT-BR') — don't hardcode a guessed list;
 *   populate pickers from `getSupportedLanguages('target')` and pass codes through
 *   verbatim.
 * - **`translate` is batched:** pass `text: string[]` (max 50 per request) instead
 *   of looping; results return one `TranslatedText` per input, each with
 *   `detectedSourceLang` when `sourceLang` was omitted.
 * - **Server-side only + quota-aware.** Keep the provider key on the API;
 *   translation is billed per character (`getUsage()` exposes the period quota) —
 *   auth and rate-limit any endpoint that translates caller-supplied text.
 * - `formality` and glossaries are provider/language-dependent — treat them as
 *   best-effort hints, not guarantees.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-translation'
 * import { createProvider } from '@molecule/api-ai-translation-deepl'
 *
 * // Wire at startup. See the bond package for its config/env (e.g. DEEPL_API_KEY).
 * setProvider(createProvider())
 *
 * // Use anywhere after startup.
 * const { translations } = await requireProvider().translate({
 *   text: ['Hello world', 'Thanks for your order'],
 *   targetLang: 'DE',
 * })
 * console.log(translations[0].text, translations[0].detectedSourceLang) // 'Hallo Welt', 'EN'
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip.
 * The sandbox has a live AI provider, so translations run for real; output is
 * non-deterministic, so assert on the resulting LANGUAGE/meaning, never an
 * exact string:
 * - [ ] Translating real text to a target language through the UI returns text
 *   ACTUALLY in that language — English→Spanish produces recognizably Spanish,
 *   not the original echoed back or left in English.
 * - [ ] Switching the target language (from the picker populated by
 *   getSupportedLanguages('target')) changes the output language for the same
 *   input — the same source re-translates into the newly chosen language.
 * - [ ] With sourceLang omitted the provider auto-detects: a known-language
 *   input comes back with the correct detectedSourceLang, and if the UI shows
 *   a detected-language label it names the right one.
 * - [ ] Text already in the target language is left sensible — unchanged or a
 *   valid paraphrase, never mangled, doubled, or emptied.
 * - [ ] Empty or untranslatable input (whitespace, emoji, a bare code snippet)
 *   is handled gracefully — a clear UI state, nothing crashes.
 * - [ ] A provider failure (bad key, quota exhausted, network drop) surfaces a
 *   visible error in the UI, not an unhandled 500 or a silently blank result.
 * - [ ] The translate call runs server-side only — the provider key never
 *   reaches the browser (check the network panel: no key in any request).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
