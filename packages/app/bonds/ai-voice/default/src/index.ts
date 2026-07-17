/**
 * Default ai-voice provider for molecule.dev — browser Web Speech API for
 * speech-to-text (SpeechRecognition) and text-to-speech (SpeechSynthesis).
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-ai-voice'
 * import { provider } from '@molecule/app-ai-voice-default'
 *
 * setProvider(provider) // at startup — lazy; no config needed
 * // setProvider(createProvider({ ... })) to pass default recognition/synthesis options
 * ```
 *
 * @remarks
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
