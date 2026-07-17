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
npm install @molecule/app-audio-recorder-react @molecule/app-i18n @molecule/app-react @molecule/app-ui react
npm install -D @types/react
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

### Functions

#### `AudioRecorder(props)`

Mic-permission + MediaRecorder UI primitive — emits a `Blob` once the user
finishes recording. Pure browser API; no upload, no transcription. Wire to
any backend by listening to `onRecorded` and POST-ing the blob.

Renders a status badge, an elapsed-time readout, and three buttons:
Record (idle/processed) → Pause/Resume + Stop (recording/paused).
All button labels and status text flow through `t()` with English
`defaultValue` fallbacks; drop in a companion locale bond to translate.

Styling is delegated to `getClassMap()` — no Tailwind / raw class names.

```typescript
function AudioRecorder({
  onRecorded,
  onError,
  mimeType,
  maxDurationSeconds = 0,
  dataMolId,
  className,
}: AudioRecorderProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props.

**Returns:** The rendered recorder element.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

`getUserMedia` only exists in a secure context — the recorder works on
`https://` and `localhost`, and permanently shows the error state on
plain HTTP. The requested `mimeType` is best-effort: unsupported types
silently fall back to the browser default (the actual type is reported
in `onRecorded`). Reaching `maxDurationSeconds` auto-stops and still
fires `onRecorded`. The recording dot's pulse uses a `mol-pulse` CSS
animation shipped in the molecule base stylesheet
(`@molecule/app-ui-tailwind`'s `base.css`, loaded by every molecule app),
so the dot animates out of the box; a host that does not load that
stylesheet can define `@keyframes mol-pulse { 50% { opacity: .4 } }`
itself (without it the dot is static but recording still works).
Translations come from the companion
`@molecule/app-locales-audio-recorder` locale bond.

## Translations

Translation strings are provided by `@molecule/app-locales-audio-recorder`.
