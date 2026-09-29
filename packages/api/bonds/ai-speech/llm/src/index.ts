/**
 * Language-model speech-to-text provider for molecule.dev.
 *
 * Implements `transcribe` from `@molecule/api-ai-speech` with any
 * `@molecule/api-ai` chat model that accepts audio input, so an app with no
 * speech service still gets batch transcription through the model it already
 * pays for — hosted or self-hosted.
 *
 * @example
 * ```typescript
 * import { setProvider as setAi } from '@molecule/api-ai'
 * import { provider as google } from '@molecule/api-ai-google'
 * import { requireProvider, setProvider } from '@molecule/api-ai-speech'
 * import { createProvider } from '@molecule/api-ai-speech-llm'
 *
 * setAi(google) // the app's AI provider — its model must accept audio
 * setProvider(createProvider()) // or createProvider({ ai, model }) for another
 *
 * const { text } = await requireProvider().transcribe!({
 *   audio: new Uint8Array(recordingBytes),
 *   filename: 'memo.webm',
 *   language: 'en',
 * })
 * ```
 *
 * @remarks
 * - **The model must accept audio input.** Most chat models do not — a
 *   text-only model fails the request or invents a transcript. Do not bond
 *   this provider for a non-audio model; check the model catalog first and
 *   pass one with `createProvider({ model })`.
 * - **Batch only.** No `transcribeStream`, no `diarize()`, no `translate`, no
 *   TTS. Feature-detect per the core. `responseFormat: 'srt' | 'vtt'` throws —
 *   a chat model returns no timings — and no result carries `words` or
 *   `duration`.
 * - **`diarize: true` is best-effort text labelling, NOT acoustic diarization
 *   — treat it as unreliable.** The model is asked to prefix lines with
 *   `speaker_<n>:`; those become `segments[].speaker`, and every segment has
 *   `start = end = 0` because there are no timings. Use
 *   `@molecule/api-ai-speech-nemo-speech` when "who said what" matters.
 * - **A model is a transcriber that may "improve" the speaker** (fix grammar,
 *   drop fillers, translate) despite the prompt. Spot-check a new model before
 *   trusting it in bulk; markdown fences are stripped, other chatter lands in
 *   `text` verbatim.
 * - The `filename` extension picks the audio MIME type (`.webm` →
 *   `audio/webm`, `.m4a` → `audio/mp4`, unknown → `audio/wav`); whether the
 *   provider accepts that container is up to the chat bond and model.
 * - Uses the AI provider bonded as `ai` unless you pass one. Spend is that
 *   provider's token spend — audio bills as input tokens.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './prompt.js'
export * from './provider.js'
export * from './types.js'
