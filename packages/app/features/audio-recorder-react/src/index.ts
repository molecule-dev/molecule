/**
 * Mic-permission + MediaRecorder UI primitive — emits a `Blob` once the
 * user finishes recording. Pure browser API; no upload, no transcription.
 *
 * Used by AI-voice-assistant, AI-meeting-notes (manual capture), and
 * AI-customer-service-bot. Wire to any backend by handling `onRecorded`.
 *
 * @example
 * ```tsx
 * import { AudioRecorder } from '@molecule/app-audio-recorder-react'
 *
 * <AudioRecorder
 *   maxDurationSeconds={300}
 *   onRecorded={({ blob, mimeType, durationSeconds }) => {
 *     console.log(`Captured ${durationSeconds}s of ${mimeType}`)
 *     uploadVoiceNote(blob)
 *   }}
 * />
 * ```
 *
 * @remarks
 * `getUserMedia` only exists in a secure context — the recorder works on
 * `https://` and `localhost`, and permanently shows the error state on
 * plain HTTP. The requested `mimeType` is best-effort: unsupported types
 * silently fall back to the browser default (the actual type is reported
 * in `onRecorded`). Reaching `maxDurationSeconds` auto-stops and still
 * fires `onRecorded`. The recording dot's pulse uses a `mol-pulse` CSS
 * animation shipped in the molecule base stylesheet
 * (`@molecule/app-ui-tailwind`'s `base.css`, loaded by every molecule app),
 * so the dot animates out of the box; a host that does not load that
 * stylesheet can define `@keyframes mol-pulse { 50% { opacity: .4 } }`
 * itself (without it the dot is static but recording still works).
 * Translations come from the companion
 * `@molecule/app-locales-audio-recorder` locale bond.
 *
 * @module
 */

export * from './AudioRecorder.js'
export * from './types.js'
