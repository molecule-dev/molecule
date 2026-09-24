/**
 * OpenAI ai-speech provider for molecule.dev.
 *
 * Text-to-speech (tts-1 family) plus Whisper speech-to-text: transcription in the
 * source language and direct speech-to-English translation.
 *
 * @remarks
 * - **Wiring**: bond once at startup with the core's `setProvider(createProvider({...}))`
 *   (equivalent to `bond('ai-speech', …)` — both write the same shared bond registry). The
 *   lazy `provider` export also works (`setProvider(provider)`) and reads env on first use.
 * - **Subset**: implements `synthesize`, `transcribe`, and `translate`. It does NOT
 *   implement `synthesizeSpeech`/`synthesizeStream`/`listVoices` — feature-detect per
 *   the core; pick `@molecule/api-ai-speech-elevenlabs` for streaming TTS/voice lists.
 * - Config: `OPENAI_API_KEY` (required, SERVER-side only); `OPENAI_BASE_URL` (optional)
 *   overrides the API origin, default `https://api.openai.com`. A missing key does NOT fail
 *   fast — the first call throws the upstream 401 as `OpenAI Speech API error: …`.
 * - Defaults: TTS model `tts-1`, voice `alloy`, format `mp3`; STT model `whisper-1` with
 *   `verbose_json` (so `language`/`duration` come back). `transcribe` defaults the upload
 *   filename to `audio.wav` — pass the real `filename` so Whisper detects the container.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-speech'
 * import { createProvider } from '@molecule/api-ai-speech-openai'
 *
 * // Startup (server only): the key comes from the server env.
 * setProvider(createProvider({ apiKey: process.env.OPENAI_API_KEY }))
 *
 * const speech = requireProvider()
 * // Every AISpeechProvider method is optional — feature-detect before calling.
 * if (!speech.synthesize || !speech.transcribe) throw new Error('Speech not supported')
 *
 * // TTS: raw audio bytes + Content-Type (send them as a binary response body).
 * const { audio, contentType } = await speech.synthesize({
 *   input: 'Your order shipped!',
 *   voice: 'alloy',
 *   responseFormat: 'mp3',
 * })
 * console.log(contentType, audio.byteLength) // 'audio/mpeg' 4
 *
 * // STT: raw audio bytes plus a filename hint for the container format.
 * const { text, language, duration } = await speech.transcribe({ audio, filename: 'reply.mp3' })
 * console.log(text, language, duration) // 'Your order shipped!' 'english' 1.2 (seconds)
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
