/**
 * OpenAI ai-speech provider for molecule.dev.
 *
 * Text-to-speech (tts-1 family) plus Whisper speech-to-text: transcription in the
 * source language and direct speech-to-English translation.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-speech'
 * import { createProvider } from '@molecule/api-ai-speech-openai'
 *
 * // This bond exports NO `provider` const — wire the factory (reads OPENAI_API_KEY):
 * setProvider(createProvider())
 *
 * const speech = requireProvider()
 * const { audio, contentType } = await speech.synthesize({ input: 'Hello!', voice: 'alloy' })
 * const { text } = await speech.transcribe!({ audio: buf, model: 'whisper-1' })
 * ```
 *
 * @remarks
 * - **Wiring**: unlike sibling bonds there is no lazy `provider` export — call
 *   `setProvider(createProvider(config?))`. Use the core's `setProvider`, NOT
 *   `bond('ai-speech', …)` (the core keeps its own singleton).
 * - **Subset**: implements `synthesize`, `transcribe`, and `translate`. It does NOT
 *   implement `synthesizeSpeech`/`synthesizeStream`/`listVoices` — feature-detect per
 *   the core; pick `@molecule/api-ai-speech-elevenlabs` for streaming TTS/voice lists.
 * - Config: `OPENAI_API_KEY` (required, SERVER-side only); `OPENAI_BASE_URL` (optional)
 *   overrides the API origin, default `https://api.openai.com`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
