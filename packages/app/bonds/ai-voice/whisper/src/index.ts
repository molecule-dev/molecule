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
 * import { setProvider } from '@molecule/app-ai-voice'
 * import { createProvider } from '@molecule/app-ai-voice-whisper'
 *
 * setProvider(
 *   createProvider({
 *     onModelProgress: (e) => console.log(e.status, e.progress),
 *   }),
 * )
 * ```
 *
 * @remarks
 * The first use downloads the model (tens of MB, cached by the browser
 * afterwards) — always wire `onModelProgress` to a visible indicator.
 * Transcripts arrive as final chunks after each pause; there are no
 * interim results. The default `onnx-community/whisper-base` model is
 * multilingual; Moonshine models are faster but English-only.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
