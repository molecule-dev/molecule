# @molecule/app-audio-recorder-react

Mic-permission + MediaRecorder UI primitive — emits a `Blob` once the
user finishes recording. Pure browser API; no upload, no transcription.

Used by AI-voice-assistant, AI-meeting-notes (manual capture), and
AI-customer-service-bot. Wire to any backend by handling `onRecorded`.

## Quick Start

```tsx
import { AudioRecorder } from '@molecule/app-audio-recorder-react'

<AudioRecorder
  maxDurationSeconds={300}
  onRecorded={({ blob, mimeType, durationSeconds }) => {
    console.log(`Captured ${durationSeconds}s of ${mimeType}`)
    uploadVoiceNote(blob)
  }}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-audio-recorder-react
```

## API

### Interfaces

#### `AudioRecorderProps`

Props for {@link AudioRecorder}.

```typescript
interface AudioRecorderProps {
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
```

#### `AudioRecording`

Result emitted via `onRecorded` once a recording finishes.

```typescript
interface AudioRecording {
  /** The captured audio as a `Blob`. */
  blob: Blob
  /** Audio MIME type (e.g. `'audio/webm'`). */
  mimeType: string
  /** Recording duration in seconds (whole-second precision). */
  durationSeconds: number
}
```

### Types

#### `AudioRecorderState`

Recorder lifecycle states.

```typescript
type AudioRecorderState = 'idle' | 'recording' | 'paused' | 'processed' | 'error'
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
