/**
 * Public types for `<AudioRecorder>`.
 *
 * @module
 */

/** Recorder lifecycle states. */
export type AudioRecorderState = 'idle' | 'recording' | 'paused' | 'processed' | 'error'

/** Result emitted via `onRecorded` once a recording finishes. */
export interface AudioRecording {
  /** The captured audio as a `Blob`. */
  blob: Blob
  /** Audio MIME type (e.g. `'audio/webm'`). */
  mimeType: string
  /** Recording duration in seconds (whole-second precision). */
  durationSeconds: number
}

/** Props for {@link AudioRecorder}. */
export interface AudioRecorderProps {
  /**
   * Called once the user stops recording and a Blob is ready. Parents are
   * responsible for uploading or persisting the blob.
   */
  onRecorded: (rec: AudioRecording) => void
  /**
   * Called whenever a recording error occurs (permission denied, no
   * MediaRecorder support, hardware failure). Optional — the component
   * surfaces a translated error message regardless.
   */
  onError?: (err: Error) => void
  /**
   * Optional MIME type to request from MediaRecorder. Falls back to the
   * browser's default if unsupported. Common values: `'audio/webm'`,
   * `'audio/mp4'`, `'audio/ogg;codecs=opus'`.
   */
  mimeType?: string
  /**
   * Maximum recording duration (seconds). When reached, recording stops
   * automatically and `onRecorded` fires. `0` (default) means unlimited.
   */
  maxDurationSeconds?: number
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string
}
