/**
 * OpenAI ai-speech provider for molecule.dev.
 *
 * Text-to-speech (tts-1 family) plus Whisper speech-to-text: transcription in the
 * source language and direct speech-to-English translation.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-speech'
 * import { provider } from '@molecule/api-ai-speech-openai'
 *
 * setProvider(provider) // at startup — lazy; reads OPENAI_API_KEY on first use
 *
 * const speech = requireProvider()
 * const { audio, contentType } = await speech.synthesize({ input: 'Hello!', voice: 'alloy' })
 * const { text } = await speech.transcribe!({ audio: buf, model: 'whisper-1' })
 * ```
 *
 * @remarks
 * - **Wiring**: bond the lazy `provider` export once — `setProvider(provider)` — or
 *   `setProvider(createProvider(config?))` to pass explicit config. Use the core's
 *   `setProvider`, NOT `bond('ai-speech', …)` (the core keeps its own singleton).
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
