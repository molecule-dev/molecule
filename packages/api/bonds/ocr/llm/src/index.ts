/**
 * Language-model OCR provider for molecule.dev.
 *
 * Implements the `@molecule/api-ocr` contract with any vision-capable
 * `@molecule/api-ai` provider, so text extraction can run on whichever model
 * is cheapest or best for the job — a hosted model (GPT, Gemini, Claude, GLM,
 * …) or a self-hosted one through `@molecule/api-ai-local` — with no OCR-vendor
 * account at all.
 *
 * @example
 * ```typescript
 * import { setProvider as setAi } from '@molecule/api-ai'
 * import { provider as openai } from '@molecule/api-ai-openai'
 * import { setProvider, requireProvider } from '@molecule/api-ocr'
 * import { createProvider } from '@molecule/api-ocr-llm'
 *
 * setAi(openai) // the app's AI provider
 * setProvider(createProvider()) // recognize with it — or createProvider({ ai, model }) for another
 *
 * const result = await requireProvider().recognize({
 *   data: new Uint8Array(imageBytes),
 *   mimeType: 'image/png',
 *   language: 'en',
 * })
 * ```
 *
 * @remarks
 * - **The model must accept image input.** Check the model catalog's
 *   `supportsVision` before pointing this bond at a model; a text-only model
 *   fails the request (or worse, "describes" the image). Pass a specific one
 *   with `createProvider({ model })` — cheap vision models beat flagships on
 *   price for plain transcription.
 * - **Uses the AI provider bonded as `ai` unless you pass one.** To recognize
 *   with a different model than the app chats with, pass
 *   `createProvider({ ai, model })`. Spend is the AI provider's token spend —
 *   images bill as input tokens, often the dominant cost of a call.
 * - **A model is a transcriber, not a scanner.** There is no `confidence`
 *   score (a model cannot calibrate one), no coordinates, no table structure —
 *   and a strong model will "fix" a typo in the source image unless the prompt
 *   holds it to verbatim transcription. For layout-sensitive scans use
 *   `@molecule/api-ocr-tesseract` and diff the outputs.
 * - **The output is the model's text answer, fenced or not.** Markdown fences
 *   are stripped; anything else the model appends (a preamble, a translation
 *   instead of a transcription) lands in `text` verbatim — spot-check a new
 *   model + image class pair before trusting it in bulk.
 * - `language` accepts any language name or BCP-47 tag (`de`, `zh-TW`) — it
 *   only steers the prompt, so a wrong hint can push the model to transcribe
 *   in the wrong script.
 */
export * from './browser-guard.js'
export * from './prompt.js'
export * from './provider.js'
export * from './types.js'
