/**
 * On-device Whistle voice provider using the Cactus needle WASM engine.
 *
 * Speech-to-text that runs entirely in the browser on CPU (WebAssembly — no
 * WebGPU needed): Cactus Compute's 16.9 MB Whistle model transcribes seven
 * languages (en, de, fr, es, it, nl, pl) with automatic language detection,
 * optional keyword biasing and per-word timestamps. No audio ever leaves the
 * device, and it works in Brave, ungoogled Chromium and Firefox, where the
 * native SpeechRecognition API is a non-functional stub.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-ai-voice'
 * import { createProvider, supportsRecognitionLanguage } from '@molecule/app-ai-voice-whistle'
 *
 * if (supportsRecognitionLanguage(navigator.language)) {
 *   setProvider(
 *     createProvider({
 *       onModelProgress: (e) => console.log(e.status, e.progress),
 *     }),
 *   )
 * }
 * ```
 *
 * @remarks
 * The first use downloads the engine and weights (~18 MB total: ~1 MB WASM +
 * 16.9 MB `whistle.cact`; cached by the browser afterwards) — wire
 * `onModelProgress` to a visible indicator. Whistle transcribes EXACTLY seven
 * languages (`en de fr es it nl pl`); for anything else wire
 * `@molecule/app-ai-voice-whisper` (~99 languages, larger download) or
 * `@molecule/app-ai-voice-parakeet` (25 languages, needs WebGPU for its fast
 * path) — check with `supportsRecognitionLanguage()` before wiring. Transcripts
 * arrive as final chunks after each pause (no interim results), and each chunk
 * is at most 30 s (Whistle's per-pass window). Silence or steady noise
 * transcribes to an EMPTY transcript — it is never reported as an error or a
 * detected language. Keyword biasing (`keywords`) deliberately CHANGES
 * transcripts toward the given words: pass identifiers you care about, not a
 * big "helpful" list. The engine is process-global and not thread-safe — one
 * wasm instance is shared by every provider in the page, and transcription
 * blocks the main thread for the duration of a pass (tens to low hundreds of
 * ms for dictation-length chunks). Under a Content-Security-Policy, self-host
 * `needle.js`, `needle.wasm` and `whistle.cact` same-origin and pass
 * `engineUrl`/`weightsUrl` pointing at them. Text-to-speech delegates to the
 * browser's SpeechSynthesis API.
 *
 * @module
 */

export * from './engine.js'
export * from './provider.js'
export * from './types.js'
