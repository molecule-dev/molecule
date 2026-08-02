# @molecule/app-ai-voice-parakeet

On-device NVIDIA Parakeet voice provider using parakeet.js.

Leaderboard-topping speech-to-text that runs entirely in the browser
(WebGPU encoder + WASM decoder) — no cloud speech service and no Web
Speech API backend required. Works in Brave, ungoogled Chromium, and
Firefox, where the native SpeechRecognition API is a non-functional stub.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-ai-voice'
import { createProvider, supportsRecognitionLanguage } from '@molecule/app-ai-voice-parakeet'

if (await supportsRecognitionLanguage(navigator.language)) {
  setProvider(
    createProvider({
      onModelProgress: (e) => console.log(e.status, e.progress),
    }),
  )
}
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ai-voice-parakeet @molecule/app-ai-voice parakeet.js
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

#### `ParakeetVoiceConfig`

Configuration for the on-device Parakeet voice provider.

```typescript
interface ParakeetVoiceConfig {
  /**
   * parakeet.js model key or Hugging Face repo id. Default:
   * 'parakeet-tdt-0.6b-v3' (multilingual). 'parakeet-tdt-0.6b-v2' is
   * English-only but slightly smaller/faster.
   */
  model?: string
  /**
   * Inference backend. 'auto' (default) picks WebGPU when available and
   * falls back to WASM.
   */
  backend?: 'auto' | 'webgpu' | 'wasm'
  /**
   * URL prefix (directory) the ONNX Runtime WASM/JS runtime files are served
   * from — e.g. '/ort/'. Without it, parakeet.js loads the runtime from the
   * jsdelivr CDN, which any app with a `script-src 'self'` CSP (correctly)
   * blocks. Serve the `ort-wasm-simd-threaded*` files from parakeet.js's own
   * onnxruntime-web dependency (version must match). Applied through the
   * lib's global ort instance with one retry, because parakeet.js's own
   * wasmPaths option is ignored upstream.
   */
  wasmPaths?: string
  /** Encoder weight quantization. Default 'int8' (smallest download). */
  encoderQuant?: 'int8' | 'fp16' | 'fp32'
  /** Decoder weight quantization. Default 'int8'. */
  decoderQuant?: 'int8' | 'fp16' | 'fp32'
  /**
   * Called with model download/initialization progress — wire this to a UI
   * indicator, since the first use downloads the model (hundreds of MB for
   * the 0.6B models; cached by the browser afterwards).
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
   * this size even without a pause. Default 15.
   */
  maxChunkSeconds?: number
}
```

### Classes

#### `ParakeetVoiceProvider`

On-device NVIDIA Parakeet speech-to-text provider.

Captures microphone audio, segments it on pauses, and transcribes each
segment locally with a parakeet.js ONNX model.

### Functions

#### `createProvider(config)`

Creates a ParakeetVoiceProvider instance.

```typescript
function createProvider(config?: ParakeetVoiceConfig): ParakeetVoiceProvider
```

- `config` — Optional configuration (model, backend, VAD tuning).

**Returns:** A ParakeetVoiceProvider running speech-to-text on-device.

#### `supportsRecognitionLanguage(language, model)`

Checks whether a Parakeet model can transcribe the given BCP-47 language.
Use this at wiring time to decide between this provider and a
multilingual Whisper provider.

```typescript
function supportsRecognitionLanguage(language: string, model?: string): Promise<boolean>
```

- `language` — BCP-47 language tag (e.g. 'en-US', 'ja').
- `model` — parakeet.js model key or repo id. Defaults to the provider's default model.

**Returns:** A promise resolving to true when the model covers the language.

### Constants

#### `provider`

The provider implementation — the fleet-standard typed `provider` const.

Wire it once at startup: `setProvider(provider)` from `@molecule/app-ai-voice`.
It is a lazy proxy: construction is deferred to the first property access, so
importing this module never throws and needs no config up front. Use
`createProvider(config)` instead when you need a custom model, backend, or
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
import { provider } from '@molecule/app-ai-voice-parakeet'

export function setupAiVoiceParakeet(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ai-voice` ^1.0.0

### Runtime Dependencies

- `@molecule/app-ai-voice`
- `parakeet.js`

The first use downloads the model (hundreds of MB at int8, cached by the
browser afterwards) — always wire `onModelProgress` to a visible
indicator. The default `parakeet-tdt-0.6b-v3` model covers en, fr, de,
es, it, pt, nl, pl, ru, uk, ja, ko and zh with automatic language
detection; for other languages wire `@molecule/app-ai-voice-whisper`
instead (smaller download, broader language coverage, lower accuracy).
Transcripts arrive as final chunks after each pause; there are no
interim results.

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
