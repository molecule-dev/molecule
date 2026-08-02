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
 * import { setProvider } from '@molecule/app-ai-voice'
 * import { createProvider, supportsRecognitionLanguage } from '@molecule/app-ai-voice-parakeet'
 *
 * if (await supportsRecognitionLanguage(navigator.language)) {
 *   setProvider(
 *     createProvider({
 *       onModelProgress: (e) => console.log(e.status, e.progress),
 *     }),
 *   )
 * }
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
 * @module
 */

export * from './provider.js'
export * from './types.js'
