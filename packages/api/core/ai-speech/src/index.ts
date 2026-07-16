/**
 * AI speech core interface for molecule.dev — text-to-speech (TTS) and
 * speech-to-text (STT).
 *
 * Defines the `AISpeechProvider` contract (synthesize speech, transcribe or
 * translate audio, list voices) and the accessor (`setProvider`/`getProvider`/
 * `hasProvider`/`requireProvider`). Interface-only: bond a provider package
 * (e.g. `@molecule/api-ai-speech-openai`, `@molecule/api-ai-speech-elevenlabs`).
 *
 * @remarks
 * - **Wire it with THIS package's `setProvider()` — NOT `bond('ai-speech', …)`.**
 *   This core keeps its own singleton and does not read the `@molecule/api-bond`
 *   registry: a generic `bond(...)` call appears to succeed, but `requireProvider()`
 *   still throws at first use. Call `setProvider(...)` in the app's bond setup.
 * - **EVERY provider method is optional — feature-detect before calling.** Providers
 *   implement disjoint subsets (a TTS-only provider has no `transcribe`/`translate`;
 *   an STT-capable one may lack `synthesizeSpeech`/`listVoices`). Calling an absent
 *   method is a runtime TypeError that type-checks — guard with
 *   `if (provider.transcribe)` and surface "not supported by the configured
 *   provider" when the capability is missing.
 * - **Two TTS dialects.** `synthesize(SynthesizeParams)` (`input`, optional `voice`)
 *   and `synthesizeSpeech(SpeechParams)` (`text`, REQUIRED `voiceId`) are alternative
 *   shapes — a provider implements one of them; check which before writing the call.
 * - **Audio is bytes, not JSON.** Results carry `audio: Uint8Array` + `contentType` —
 *   return them as a binary response with that Content-Type (or store via the uploads
 *   bond); never JSON-encode the audio. For STT, pass raw audio bytes plus a
 *   `filename` hint so the provider can detect the container format.
 * - **Server-side only, gated and budgeted.** Keep the provider key on the API;
 *   auth + rate-limit user-facing synthesize/transcribe endpoints — both are billed
 *   per character/minute of audio.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-speech'
 * import { createProvider } from '@molecule/api-ai-speech-openai'
 *
 * // Wire at startup. See the bond package for its config/env (e.g. OPENAI_API_KEY).
 * setProvider(createProvider())
 *
 * const speech = requireProvider()
 *
 * // TTS — feature-detect: providers implement optional subsets.
 * if (speech.synthesize) {
 *   const { audio, contentType } = await speech.synthesize({ input: 'Your order shipped!' })
 *   // respond with the raw bytes + contentType, or persist via the uploads bond
 * }
 *
 * // STT
 * if (speech.transcribe) {
 *   const { text } = await speech.transcribe({ audio: audioBytes, filename: 'note.webm' })
 * }
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
