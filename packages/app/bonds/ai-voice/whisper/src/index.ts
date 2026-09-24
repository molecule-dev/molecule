/**
 * On-device Whisper voice provider using transformers.js.
 *
 * Speech-to-text that runs entirely in the browser — no cloud speech
 * service and no Web Speech API backend required. Works in Brave,
 * ungoogled Chromium, and Firefox, where the native SpeechRecognition
 * API is a non-functional stub.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-ai-voice'
 * import { createProvider } from '@molecule/app-ai-voice-whisper'
 *
 * // Startup: bond once. Runs fully on-device — no key, no speech service.
 * setProvider(
 *   createProvider({
 *     model: 'onnx-community/whisper-base', // multilingual (the default)
 *     wasmPaths: '/transformers-ort/', // self-hosted ORT runtime files (needed under a strict CSP)
 *     onModelProgress: ({ status, progress }) => console.log(status, progress ?? ''), // show this!
 *   }),
 * )
 *
 * // Mic button: speech-to-text through the core provider.
 * const voice = requireProvider()
 * const transcripts: string[] = []
 * voice.startListening(
 *   { language: 'fr-FR' }, // forwarded to multilingual Whisper models as 'fr'
 *   {
 *     onStateChange: (state) => console.log(state), // 'processing' while the model loads, then 'listening'
 *     onTranscript: ({ transcript }) => transcripts.push(transcript), // one FINAL result per pause
 *     onError: ({ code, message }) => console.error(code, message), // e.g. 'not-allowed' (mic denied)
 *   },
 * )
 *
 * // Second click: stop. Speech still in progress is transcribed and delivered afterwards.
 * voice.stopListening()
 * ```
 *
 * @remarks
 * The first use downloads the model (tens to hundreds of MB, cached by the
 * browser afterwards) — always wire `onModelProgress` to a visible
 * indicator. Transcripts arrive as final chunks after each pause; there are
 * no interim results. The default `onnx-community/whisper-base` model is
 * multilingual; Moonshine models are faster but English-only. GOTCHA: the
 * quantized moonshine decoder exports (q8/int8/q4/q4f16) all fail ONNX
 * session creation under transformers 4.x's bundled dev ORT — use
 * `dtype: { encoder_model: 'fp32', decoder_model_merged: 'fp32' }`. A
 * failed session is cached by transformers.js for the page's lifetime, so
 * a bad dtype cannot be retried without a reload — pick a working one up
 * front.
 *
 * The core has no top-level `startListening()` — call it on `requireProvider()` after
 * `setProvider(...)`; it returns `void` and text arrives only via `handlers.onTranscript`
 * (`confidence` is always 1 — Whisper reports none). `wasmPaths` must point at files you serve;
 * without it the ONNX runtime is fetched from the jsdelivr CDN, which a `script-src 'self'` CSP
 * blocks. `speak()` uses the browser's SpeechSynthesis and THROWS where it is missing.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
