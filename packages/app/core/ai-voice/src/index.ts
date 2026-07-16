/**
 * Voice input/output (speech-to-text + text-to-speech) core interface for
 * molecule.dev.
 *
 * Defines the `AIVoiceProvider` contract: `startListening`/`stopListening`
 * stream recognition transcripts to handlers; `speak`/`stopSpeaking` drive
 * synthesis; `getAvailableVoices` enumerates voices; `isSupported` and friends
 * feature-detect.
 *
 * @remarks
 * - **Wire it with THIS package's `setProvider()` — NOT `bond('ai-voice', …)`.**
 *   This core keeps its own local singleton and does not read the
 *   `@molecule/app-bond` registry; `requireProvider()` throws until
 *   `setProvider()` has run.
 * - **Feature-detect BEFORE showing voice UI.** The bundled bond
 *   (`@molecule/app-ai-voice-default`) uses the browser-native Web Speech APIs:
 *   recognition is missing in several browsers, requires a secure context
 *   (HTTPS) and microphone permission, and should start only from a user
 *   gesture. Gate the mic button on `isRecognitionSupported()` and handle the
 *   `'not-allowed'` error code with a visible message — a silent dead mic
 *   button is the standard failure.
 * - Interim transcripts (`isFinal: false`) are UNSTABLE — display them, but only
 *   act on (submit/save) the final ones.
 * - `getAvailableVoices()` can be empty until the browser loads voices — await
 *   it, don't read it synchronously. Call `dispose()` on unmount to release
 *   recognition instances and listeners.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-ai-voice'
 * import { createProvider } from '@molecule/app-ai-voice-default'
 *
 * setProvider(createProvider()) // at startup
 *
 * const voice = requireProvider()
 * if (voice.isRecognitionSupported()) {
 *   // start from a user gesture (click/tap), never on page load
 *   voice.startListening({ language: 'en-US', interimResults: true }, {
 *     onTranscript: ({ transcript, isFinal }) => isFinal && submit(transcript),
 *     onError: ({ code, message }) => showError(code === 'not-allowed'
 *       ? 'Microphone access was denied.' : message),
 *   })
 * }
 * await voice.speak('Order confirmed.')
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
