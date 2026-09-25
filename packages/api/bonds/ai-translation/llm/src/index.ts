/**
 * Language-model translation provider for molecule.dev.
 *
 * Implements the `@molecule/api-ai-translation` contract with any
 * `@molecule/api-ai` provider, so translation can run on whichever model is
 * cheapest or best for the job — a hosted model (DeepSeek, Qwen, GPT, Claude, …)
 * or a self-hosted one through `@molecule/api-ai-local` (vLLM, Ollama,
 * llama.cpp), with no translation-vendor account at all.
 *
 * @example
 * ```typescript
 * import { setProvider as setAi } from '@molecule/api-ai'
 * import { provider as deepseek } from '@molecule/api-ai-deepseek'
 * import { setProvider, requireProvider } from '@molecule/api-ai-translation'
 * import { createProvider } from '@molecule/api-ai-translation-llm'
 *
 * setAi(deepseek) // the app's AI provider
 * setProvider(createProvider()) // translate with it — or createProvider({ ai, model }) for another
 *
 * const { translations } = await requireProvider().translate({
 *   text: ['{{count}} items in your cart', 'Checkout'],
 *   targetLang: 'de',
 *   protect: ['{{count}}'],
 *   context: 'Labels in an online store',
 * })
 * ```
 *
 * @remarks
 * - **Uses the AI provider bonded as `ai` unless you pass one.** To translate with a
 *   cheaper model than the app chats with, pass `createProvider({ ai, model })`.
 *   Spend is the AI provider's token spend — `getUsage()` only counts characters in
 *   this process (`characterLimit` is `Infinity`).
 * - **`protect` placeholders travel as numbered tokens (`⟦0⟧`)** and are restored by
 *   index; the model may move them for word order. A batch whose answer is not a
 *   same-length JSON array, or that loses a token, is retried in halves down to one
 *   text. A text that still fails comes back WITHOUT its placeholders intact — so
 *   **check every result holds its placeholders before storing it**; never store the
 *   English source as a "translation" instead.
 * - **Language codes are free-form** (`de`, `DE`, `PT-BR`, `zh-TW`): they are turned into
 *   English language names for the model. `getSupportedLanguages()` lists ~80 common
 *   languages for pickers; the model can do more.
 * - `context` (e.g. "button labels in a banking app") and the config's `instructions`
 *   (a glossary or style guide) go into the prompt — use them: one-word UI strings are
 *   ambiguous ("Close" as a verb or an adjective), and context is the only fix.
 * - `formality`, `glossaryId`, `modelType`, `preserveFormatting` and `tagHandling` have no
 *   model equivalent and are ignored.
 * - Output quality depends on the model. Small models are weaker on low-resource
 *   languages (Yoruba, Lao, Zulu…); spot-check those.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './prompt.js'
export * from './protect.js'
export * from './provider.js'
export * from './types.js'
