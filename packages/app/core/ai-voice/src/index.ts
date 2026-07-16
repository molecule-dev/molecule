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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Pressing the mic / press-to-talk control calls `startListening()` and
 *   speech appears as a live transcript in the UI — interim VoiceTranscriptEvent
 *   updates (`isFinal: false`) refresh the text as you speak, and the final one
 *   (`isFinal: true`) commits the recognized text via `onTranscript`.
 * - [ ] Stopping (`stopListening()`) halts recognition cleanly: the transcript
 *   stops updating, the mic control returns to idle, and no stray final result
 *   fires afterward.
 * - [ ] Denying mic permission (or unavailable hardware) fires `onError` with a
 *   VoiceErrorEvent (`code: 'not-allowed'`) and shows a visible message — the mic
 *   control never sits as a silent dead button.
 * - [ ] The app's text-to-speech action calls `speak(text, ...)` and you actually
 *   hear the given text; the chosen VoiceDescriptor / VoiceSynthesisOptions are
 *   honored (`voice`, `language`, and `rate` change the audible output), and
 *   `stopSpeaking()` cuts it off.
 * - [ ] The recognition VoiceRecognitionOptions `language` is respected — setting
 *   it to a non-default locale (e.g. 'fr-FR') recognizes in that language rather
 *   than always defaulting to English.
 * - [ ] A visible listening/speaking indicator tracks `getState()` /
 *   `onStateChange` — it reads 'listening' while the mic is open and 'speaking'
 *   during synthesis, and returns to 'idle' when each ends.
 * - [ ] Voice UI is feature-gated on `isRecognitionSupported()` /
 *   `isSynthesisSupported()` (and `getAvailableVoices()` is awaited, not read
 *   synchronously) so an unsupported browser hides the control instead of
 *   throwing.
 * - [ ] Microphone access is requested only from a user gesture, its denial is
 *   handled gracefully, and captured audio/transcripts stay within the session —
 *   nothing is logged or sent anywhere the app didn't intend.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
