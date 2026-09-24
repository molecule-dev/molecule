/**
 * Mic-permission + MediaRecorder UI primitive — emits a `Blob` once the
 * user finishes recording. Pure browser API; no upload, no transcription.
 *
 * Used by AI-voice-assistant, AI-meeting-notes (manual capture), and
 * AI-customer-service-bot. Wire to any backend by handling `onRecorded`.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { AudioRecorder, type AudioRecording } from '@molecule/app-audio-recorder-react'
 *
 * export function VoiceNote() {
 *   const [note, setNote] = useState<{ url: string; seconds: number } | null>(null)
 *   const handleRecorded = ({ blob, durationSeconds }: AudioRecording) =>
 *     setNote({ url: URL.createObjectURL(blob), seconds: durationSeconds })
 *   return (
 *     <section>
 *       <AudioRecorder
 *         mimeType="audio/webm"
 *         maxDurationSeconds={300}
 *         dataMolId="voice-note-recorder"
 *         onRecorded={handleRecorded}
 *       />
 *       {note && <audio controls src={note.url} data-mol-id="voice-note-playback" />}
 *     </section>
 *   )
 * }
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
 * It calls `useTranslation()` from `@molecule/app-react`, so it MUST render
 * inside `<I18nProvider>` / `<MoleculeProvider>` (it throws otherwise);
 * `getClassMap()` throws unless `setClassMap(classMap)` ran at startup.
 * It does NOT upload, transcribe, or keep the blob — `onRecorded` is the only
 * way out, so send the blob to your backend (or `URL.createObjectURL` it for
 * playback, and revoke it when done) there. `durationSeconds` is whole
 * SECONDS, and `maxDurationSeconds` is seconds too (`0` = unlimited).
 *
 * @module
 */

export * from './AudioRecorder.js'
export * from './types.js'
