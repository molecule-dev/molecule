# @molecule/app-ai-voice-whisper

On-device Whisper voice provider using transformers.js.

Speech-to-text that runs entirely in the browser — no cloud speech
service and no Web Speech API backend required. Works in Brave,
ungoogled Chromium, and Firefox, where the native SpeechRecognition
API is a non-functional stub.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-ai-voice'
import { createProvider } from '@molecule/app-ai-voice-whisper'

setProvider(
  createProvider({
    onModelProgress: (e) => console.log(e.status, e.progress),
  }),
)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ai-voice-whisper @huggingface/transformers @molecule/app-ai-voice
```

## API

### Interfaces

#### `ModelProgressEvent`

Progress event emitted while the speech model downloads/initializes.

```typescript
interface ModelProgressEvent {
  /** Lifecycle stage of the model load. */
  status: 'downloading' | 'loading' | 'ready' | 'error'
  /** Overall download progress from 0 to 100, when known. */
  progress?: number
  /** The file currently being fetched, when known. */
  file?: string
}
```

#### `WhisperVoiceConfig`

Configuration for the on-device Whisper voice provider.

```typescript
interface WhisperVoiceConfig {
  /**
   * Hugging Face model id to run in the browser. Any transformers.js
   * automatic-speech-recognition model works — multilingual Whisper
   * (the default) or an English-only Moonshine model for lower latency.
   * Default: 'onnx-community/whisper-base'.
   */
  model?: string
  /**
   * Inference device. 'auto' (default) picks WebGPU when available and
   * falls back to WASM.
   */
  device?: 'auto' | 'webgpu' | 'wasm'
  /**
   * Model weight precision passed through to transformers.js. Leave unset
   * to use the library's per-device defaults.
   */
  dtype?: string | Record<string, string>
  /**
   * Called with model download/initialization progress — wire this to a UI
   * indicator, since the first use downloads tens of MB (cached afterwards).
   */
  onModelProgress?: (event: ModelProgressEvent) => void
  /**
   * RMS amplitude above which a frame counts as speech. Default 0.01.
   */
  speechThreshold?: number
  /**
   * Milliseconds of silence after speech that closes a chunk and sends it
   * for transcription. Default 800.
   */
  silenceMs?: number
  /**
   * Hard cap on a single chunk's length in seconds — a chunk is flushed at
   * this size even without a pause. Default 12, max 30 (Whisper's window).
   */
  maxChunkSeconds?: number
}
```

### Classes

#### `WhisperVoiceProvider`

On-device Whisper speech-to-text provider.

Captures microphone audio, segments it on pauses, and transcribes each
segment locally with a transformers.js ASR model.

### Functions

#### `createProvider(config)`

Creates a WhisperVoiceProvider instance.

```typescript
function createProvider(config?: WhisperVoiceConfig): WhisperVoiceProvider
```

- `config` — Optional configuration (model id, device, VAD tuning).

**Returns:** A WhisperVoiceProvider running speech-to-text on-device.

### Constants

#### `provider`

The provider implementation — the fleet-standard typed `provider` const.

Wire it once at startup: `setProvider(provider)` from `@molecule/app-ai-voice`.
It is a lazy proxy: construction is deferred to the first property access, so
importing this module never throws and needs no config up front. Use
`createProvider(config)` instead when you need a custom model, device, or
VAD tuning.

```typescript
const provider: AIVoiceProvider
```

## Core Interface
Implements `@molecule/app-ai-voice` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-ai-voice'
import { provider } from '@molecule/app-ai-voice-whisper'

export function setupAiVoiceWhisper(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ai-voice` ^1.0.0

### Runtime Dependencies

- `@huggingface/transformers`
- `@molecule/app-ai-voice`

The first use downloads the model (tens of MB, cached by the browser
afterwards) — always wire `onModelProgress` to a visible indicator.
Transcripts arrive as final chunks after each pause; there are no
interim results. The default `onnx-community/whisper-base` model is
multilingual; Moonshine models are faster but English-only.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Pressing the mic / press-to-talk control calls `startListening()` and
  speech appears as a live transcript in the UI — interim VoiceTranscriptEvent
  updates (`isFinal: false`) refresh the text as you speak, and the final one
  (`isFinal: true`) commits the recognized text via `onTranscript`.
- [ ] Stopping (`stopListening()`) halts recognition cleanly: the transcript
  stops updating, the mic control returns to idle, and no stray final result
  fires afterward.
- [ ] Denying mic permission (or unavailable hardware) fires `onError` with a
  VoiceErrorEvent (`code: 'not-allowed'`) and shows a visible message — the mic
  control never sits as a silent dead button.
- [ ] The app's text-to-speech action calls `speak(text, ...)` and you actually
  hear the given text; the chosen VoiceDescriptor / VoiceSynthesisOptions are
  honored (`voice`, `language`, and `rate` change the audible output), and
  `stopSpeaking()` cuts it off.
- [ ] The recognition VoiceRecognitionOptions `language` is respected — setting
  it to a non-default locale (e.g. 'fr-FR') recognizes in that language rather
  than always defaulting to English.
- [ ] A visible listening/speaking indicator tracks `getState()` /
  `onStateChange` — it reads 'listening' while the mic is open and 'speaking'
  during synthesis, and returns to 'idle' when each ends.
- [ ] Voice UI is feature-gated on `isRecognitionSupported()` /
  `isSynthesisSupported()` (and `getAvailableVoices()` is awaited, not read
  synchronously) so an unsupported browser hides the control instead of
  throwing.
- [ ] Microphone access is requested only from a user gesture, its denial is
  handled gracefully, and captured audio/transcripts stay within the session —
  nothing is logged or sent anywhere the app didn't intend.
