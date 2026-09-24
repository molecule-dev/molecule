/**
 * On-device NVIDIA Parakeet voice provider using parakeet.js.
 *
 * Leaderboard-topping speech-to-text that runs entirely in the browser
 * (WebGPU encoder + WASM decoder) — no cloud speech service and no Web
 * Speech API backend required. Works in Brave, ungoogled Chromium, and
 * Firefox, where the native SpeechRecognition API is a non-functional stub.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-ai-voice'
 * import { createProvider, supportsRecognitionLanguage } from '@molecule/app-ai-voice-parakeet'
 *
 * // Startup: bond once — only if the model covers the user's language.
 * const language = 'en-US' // e.g. navigator.language
 * if (await supportsRecognitionLanguage(language)) {
 *   setProvider(
 *     createProvider({
 *       onModelProgress: ({ status, progress }) => console.log(status, progress ?? ''), // show this!
 *     }),
 *   )
 * }
 *
 * // Mic button: speech-to-text through the core provider (throws if nothing was bonded).
 * const voice = requireProvider()
 * const transcripts: string[] = []
 * voice.startListening(
 *   { language },
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
 * The first use downloads the model (hundreds of MB at int8, cached by the
 * browser afterwards) — always wire `onModelProgress` to a visible
 * indicator. The default `parakeet-tdt-0.6b-v3` model covers en, fr, de,
 * es, it, pt, nl, pl, ru, uk, ja, ko and zh with automatic language
 * detection; for other languages wire `@molecule/app-ai-voice-whisper`
 * instead (smaller download, broader language coverage, lower accuracy).
 * Transcripts arrive as final chunks after each pause; there are no
 * interim results.
 *
 * The core has no top-level `startListening()` — call it on `requireProvider()` after
 * `setProvider(...)`; it returns `void` and text arrives only via `handlers.onTranscript`.
 * Recognition needs `navigator.mediaDevices.getUserMedia`, `AudioContext` and WebAssembly
 * (`isRecognitionSupported()`); WebGPU is optional. Apps with a `script-src 'self'` CSP must
 * serve the ONNX Runtime files themselves and pass `wasmPaths` (e.g. `'/ort/'`), otherwise the
 * runtime is fetched from the jsdelivr CDN and blocked. `speak()` uses the browser's
 * SpeechSynthesis and THROWS where it is missing.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
