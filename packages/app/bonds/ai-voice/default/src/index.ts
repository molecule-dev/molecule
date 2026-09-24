/**
 * Default ai-voice provider for molecule.dev — browser Web Speech API for
 * speech-to-text (SpeechRecognition) and text-to-speech (SpeechSynthesis).
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-ai-voice'
 * import { createProvider } from '@molecule/app-ai-voice-default'
 *
 * // Startup: bond once. No key — the browser's Web Speech API does the work.
 * setProvider(
 *   createProvider({ recognition: { language: 'en-US', interimResults: true }, synthesis: { rate: 1 } }),
 * )
 *
 * // Anywhere (e.g. a mic button handler): speech-to-text through the core provider.
 * const voice = requireProvider()
 * let heard = ''
 * if (voice.isRecognitionSupported()) {
 *   voice.startListening(
 *     { continuous: false },
 *     {
 *       onTranscript: ({ transcript, isFinal }) => {
 *         if (isFinal) heard = transcript // e.g. "book a table for two"
 *       },
 *       onError: ({ code, message }) => console.error(code, message),
 *     },
 *   )
 * }
 *
 * // Text-to-speech: resolves when the utterance finishes (throws if unsupported).
 * if (voice.isSynthesisSupported()) await voice.speak('Your table is booked.')
 * voice.stopListening()
 * ```
 *
 * @remarks
 * The core has no top-level `startListening()`/`speak()` — call them on `requireProvider()` after
 * `setProvider(...)`. `startListening()` returns `void`: transcripts arrive ONLY through
 * `handlers.onTranscript` (interim ones too unless `interimResults: false` — check `isFinal`).
 *
 * Failure modes are asymmetric: when recognition is unsupported,
 * `startListening()` reports `{ code: 'not-supported' }` through
 * `handlers.onError` and returns — but when synthesis is unsupported,
 * `speak()` THROWS. Feature-detect with `isRecognitionSupported()` /
 * `isSynthesisSupported()` and wrap `speak()` in try/catch.
 * `speak()` cancels any utterance already playing. `autoRestart`
 * (default true) only applies with `continuous: true`, where transient
 * `'no-speech'` ends are swallowed and listening resumes automatically —
 * call `stopListening()` to actually stop. `options.voice` matches by voice
 * `name` or `voiceURI` from `getAvailableVoices()`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
