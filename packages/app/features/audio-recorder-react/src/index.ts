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
 * @module
 */

export * from './AudioRecorder.js'
export * from './types.js'
