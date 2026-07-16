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
 *   `https://api.elevenlabs.io`.
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
