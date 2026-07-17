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
 * - **Wire it at startup with `setProvider(...)` — or the equivalent
 *   `bond('ai-speech', provider)`.** This core routes through the shared
 *   `@molecule/api-bond` registry, so either call registers the same provider and
 *   `validateBonds()` reports it as missing when unwired.
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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip.
 * The wired provider implements a subset (TTS, STT, or both) — feature-detect
 * and run only the direction(s) it actually exposes:
 * - [ ] TTS: each read-aloud / narration / voice-note flow the app defines
 *   returns real PLAYABLE audio — the response carries an audio Content-Type
 *   (e.g. `audio/mpeg`) and non-trivial bytes (not a 0-byte file, not a
 *   JSON-encoded blob), and the UI's `<audio>`/player actually plays it. The
 *   spoken audio reflects the input text you sent.
 * - [ ] TTS: synthesizing two different strings yields two audibly different
 *   clips (distinct byte payloads) — proves the text drives synthesis and you
 *   are not hearing a cached/placeholder file.
 * - [ ] TTS: any exposed voice/format/speed option takes effect — switching
 *   voice (`voice`/`voiceId`) or output format (`responseFormat`/
 *   `outputFormat`) changes the returned audio (audible voice, Content-Type,
 *   or file extension); an unknown voice/format surfaces a visible error
 *   rather than silently falling back.
 * - [ ] STT: transcribing a KNOWN spoken clip returns text that MATCHES the
 *   words spoken (not empty, not garbage) and renders in the UI; translating
 *   a non-English clip returns English text. Any timestamps the UI shows line
 *   up with the audio.
 * - [ ] STT: a silent / empty / too-short clip is handled gracefully — an
 *   empty or "no speech detected" result shown in the UI, never a crash or a
 *   spinner that hangs forever.
 * - [ ] The audio artifact is served from the app's OWN origin (a stored
 *   upload or a route the app serves), NOT a raw expiring provider URL — copy
 *   the audio src, reload it later, and confirm it still plays.
 * - [ ] A provider error (bad key, quota, unsupported format/voice, or a
 *   capability the wired provider lacks) surfaces as a readable message in the
 *   UI, not an unhandled crash or a blank/broken player.
 * - [ ] Synthesis/transcription runs SERVER-SIDE and authorized: the provider
 *   key never reaches the browser (check the network tab / client bundle), and
 *   no unauthenticated or unbounded endpoint lets a caller fire arbitrary
 *   synthesize/transcribe calls — each is billed per character / per minute of
 *   audio, so an open endpoint is a cost-DoS vector.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
