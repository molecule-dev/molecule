/**
 * ElevenLabs ai-speech provider for molecule.dev.
 *
 * Text-to-speech via the ElevenLabs API: high-quality single-shot synthesis,
 * chunked streaming synthesis, and voice listing.
 *
 * @remarks
 * - **TTS-only subset**: implements `synthesizeSpeech(SpeechParams)`, `synthesizeStream`,
 *   and `listVoices`. It does NOT implement `synthesize` (the other TTS dialect),
 *   `transcribe`, or `translate` — feature-detect per the `@molecule/api-ai-speech` core
 *   and pair with an STT-capable provider (e.g. `@molecule/api-ai-speech-openai`) when
 *   the app needs transcription.
 * - Config: `ELEVENLABS_API_KEY` (required, SERVER-side only); `ELEVENLABS_BASE_URL`
 *   (optional) overrides the API origin (proxies/gateways), default
 *   `https://api.elevenlabs.io`. A missing key does NOT fail fast — the first call throws
 *   the upstream 401 as `ElevenLabs API error: …`.
 * - **Wiring**: bond once at startup with the core's `setProvider(createProvider({...}))`
 *   (equivalent to `bond('ai-speech', …)`). Importing this package wires nothing by itself.
 * - `voiceId` is REQUIRED by `SpeechParams` and is an ElevenLabs voice ID (e.g.
 *   `JBFqnCBsd6RMkjVDRZzb`), NOT a display name — get IDs from `listVoices()`. An empty string
 *   falls back to `defaultVoiceId`.
 * - `outputFormat` uses ElevenLabs codes (`mp3_44100_128` default, `pcm_16000`, `ulaw_8000`, …),
 *   not bare `mp3`/`wav`. Defaults: model `eleven_multilingual_v2`, stability `0.5`,
 *   similarity boost `0.75`.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-speech'
 * import { createProvider } from '@molecule/api-ai-speech-elevenlabs'
 *
 * // Startup (server only): the key comes from the server env.
 * setProvider(createProvider({ apiKey: process.env.ELEVENLABS_API_KEY }))
 *
 * const speech = requireProvider()
 * // Every AISpeechProvider method is optional — feature-detect before calling.
 * if (!speech.listVoices || !speech.synthesizeSpeech) throw new Error('TTS not supported')
 *
 * // Pick a voice by name, then synthesize with its ID.
 * const voices = await speech.listVoices()
 * const george = voices.find((voice) => voice.name === 'George') ?? voices[0]
 * if (!george) throw new Error('No voices available')
 *
 * const { audio, contentType } = await speech.synthesizeSpeech({
 *   text: 'Your order shipped!',
 *   voiceId: george.voiceId,
 *   outputFormat: 'mp3_44100_128',
 * })
 * console.log(contentType, audio.byteLength) // 'audio/mpeg' 4 — send these raw bytes as the response body
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { AISpeechProvider } from '@molecule/api-ai-speech'

import { createProvider } from './provider.js'

/** Lazily-initialized provider singleton. Defers creation until first use so that env vars are resolved. */
let _provider: AISpeechProvider | null = null

/**
 * The provider implementation.
 */
export const provider: AISpeechProvider = new Proxy({} as AISpeechProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
