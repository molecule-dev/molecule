/**
 * molecule.dev hosted speech provider for `@molecule/api-ai-speech`.
 *
 * Text-to-speech and transcription run on molecule.dev and are billed to your
 * molecule project, so the app needs no OpenAI account. It is an ordinary
 * bond: swap it for `@molecule/api-ai-speech-openai` (your own key) or
 * `@molecule/api-ai-speech-elevenlabs` without changing code that calls the core.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-speech'
 * import { provider } from '@molecule/api-ai-speech-molecule'
 *
 * setProvider(provider) // reads MOLECULE_API_KEY from the environment
 *
 * const speech = requireProvider()
 * const { audio, contentType } = await speech.synthesize!({ input: 'Your order shipped.', voice: 'nova' })
 * const { text, duration } = await speech.transcribe!({ audio: uploadedBytes, filename: 'memo.m4a' })
 * ```
 *
 * @remarks
 * - Config: `MOLECULE_API_KEY` (SERVER-side only) — a molecule project API key
 *   (`mk_…`) with scope `broker` or `broker:speech`. Optional
 *   `MOLECULE_SERVICES_URL` (default `https://api.molecule.dev/api/v1/services`).
 * - Implements ONLY `synthesize` and `transcribe`. `synthesizeSpeech`,
 *   `synthesizeStream`, `listVoices` and `translate` are absent — check before
 *   calling (`if (speech.listVoices)`), or bond the ElevenLabs provider for them.
 * - `synthesize`: models `tts-1` (default) and `tts-1-hd`; voices alloy, ash,
 *   coral, echo, fable, nova, onyx, sage, shimmer; formats mp3 (default), opus,
 *   aac, flac, wav, pcm; at most 4096 characters per call — split long text at
 *   sentence boundaries. `instructions` (a gpt-4o-mini-tts feature) is not sent.
 * - `transcribe`: `whisper-1` only; always returns text, language, duration and
 *   segments. Pass `filename` with the right extension (`.m4a`, `.webm`, …) —
 *   the service uses it to recognise the format. At most 12 MB per call.
 * - Errors are `MoleculeServiceError` with `status` and `errorKey`. 401: bad,
 *   revoked, or wrong-scope key. 402: the project owner's included allowance is
 *   used up — usage billing must be enabled on molecule.dev. 413: input too
 *   large. 429 / 503: slow down / retry later. Nothing is retried for you.
 * - Never import this from browser code: the key would ship to every visitor.
 *   Browser recordings go to YOUR API route, which calls `transcribe`.
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
