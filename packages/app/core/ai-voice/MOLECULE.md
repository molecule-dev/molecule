# @molecule/app-ai-voice

Voice input/output (speech-to-text + text-to-speech) core interface for
molecule.dev.

Defines the `AIVoiceProvider` contract: `startListening`/`stopListening`
stream recognition transcripts to handlers; `speak`/`stopSpeaking` drive
synthesis; `getAvailableVoices` enumerates voices; `isSupported` and friends
feature-detect.

## Quick Start

```typescript
import { requireProvider, setProvider } from '@molecule/app-ai-voice'
import { createProvider } from '@molecule/app-ai-voice-default'

setProvider(createProvider()) // at startup

const voice = requireProvider()
if (voice.isRecognitionSupported()) {
  // start from a user gesture (click/tap), never on page load
  voice.startListening({ language: 'en-US', interimResults: true }, {
    onTranscript: ({ transcript, isFinal }) => isFinal && submit(transcript),
    onError: ({ code, message }) => showError(code === 'not-allowed'
      ? 'Microphone access was denied.' : message),
  })
}
await voice.speak('Order confirmed.')
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-ai-voice @molecule/app-bond
```

## API

### Interfaces

#### `AIVoiceConfig`

Configuration for the AIVoice provider.

```typescript
interface AIVoiceConfig {
  /** Default recognition options applied to all startListening calls. */
  recognition?: VoiceRecognitionOptions
  /** Default synthesis options applied to all speak calls. */
  synthesis?: VoiceSynthesisOptions
}
```

#### `AIVoiceProvider`

Voice provider interface that all ai-voice bond packages must implement.
Provides speech-to-text (recognition), text-to-speech (synthesis),
state management, and voice enumeration.

```typescript
interface AIVoiceProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Starts speech recognition (speech-to-text).
   * @param options - Recognition options (language, continuous mode, etc.).
   * @param handlers - Callbacks for transcript results, state changes, and errors.
   */
  startListening(options?: VoiceRecognitionOptions, handlers?: VoiceEventHandlers): void

  /**
   * Stops speech recognition.
   */
  stopListening(): void

  /**
   * Speaks the given text aloud using speech synthesis (text-to-speech).
   * Resolves when speech finishes or is interrupted.
   * @param text - The text to speak.
   * @param options - Synthesis options (voice, rate, pitch, etc.).
   * @returns A promise that resolves when speech completes.
   */
  speak(text: string, options?: VoiceSynthesisOptions): Promise<void>

  /**
   * Stops any current speech synthesis.
   */
  stopSpeaking(): void

  /**
   * Returns the current voice provider state.
   * @returns The current VoiceState.
   */
  getState(): VoiceState

  /**
   * Checks whether voice features are supported in the current environment.
   * @returns True if at least one of recognition or synthesis is available.
   */
  isSupported(): boolean

  /**
   * Checks whether speech recognition (STT) is supported.
   * @returns True if the browser supports the SpeechRecognition API.
   */
  isRecognitionSupported(): boolean

  /**
   * Checks whether speech synthesis (TTS) is supported.
   * @returns True if the browser supports the SpeechSynthesis API.
   */
  isSynthesisSupported(): boolean

  /**
   * Returns the list of available speech synthesis voices.
   * @returns A promise that resolves to an array of VoiceDescriptor objects.
   */
  getAvailableVoices(): Promise<VoiceDescriptor[]>

  /**
   * Cleans up resources (recognition instances, event listeners, etc.).
   */
  dispose(): void
}
```

#### `VoiceDescriptor`

Descriptor for an available speech synthesis voice.

```typescript
interface VoiceDescriptor {
  /** Unique identifier for the voice. */
  id: string
  /** Human-readable name (e.g. 'Google US English'). */
  name: string
  /** BCP-47 language code (e.g. 'en-US'). */
  language: string
  /** Whether this is the default voice for its language. */
  isDefault: boolean
  /** Whether this voice is available locally (vs. requiring network). */
  isLocal: boolean
}
```

#### `VoiceErrorEvent`

A voice error event with a code and human-readable message.

```typescript
interface VoiceErrorEvent {
  /** Machine-readable error code (e.g. 'not-allowed', 'no-speech', 'network'). */
  code: string
  /** Human-readable error description. */
  message: string
}
```

#### `VoiceEventHandlers`

Event handlers for voice provider state changes and results.

```typescript
interface VoiceEventHandlers {
  /** Called when a transcript (interim or final) is available. */
  onTranscript?: (event: VoiceTranscriptEvent) => void
  /** Called when the voice state changes. */
  onStateChange?: (state: VoiceState) => void
  /** Called when an error occurs. */
  onError?: (event: VoiceErrorEvent) => void
  /** Called when speech synthesis finishes. */
  onSpeakEnd?: () => void
}
```

#### `VoiceRecognitionOptions`

Options for configuring speech recognition (speech-to-text).

```typescript
interface VoiceRecognitionOptions {
  /** BCP-47 language code (e.g. 'en-US', 'fr-FR'). */
  language?: string
  /** When true, recognition continues after the first final result. */
  continuous?: boolean
  /** When true, interim (partial) results are reported. */
  interimResults?: boolean
  /** Maximum number of alternative transcriptions to return. */
  maxAlternatives?: number
}
```

#### `VoiceSynthesisOptions`

Options for configuring speech synthesis (text-to-speech).

```typescript
interface VoiceSynthesisOptions {
  /** BCP-47 language code for synthesis. */
  language?: string
  /** Voice name or identifier to use. */
  voice?: string
  /** Speech rate from 0.1 to 10. Default is 1. */
  rate?: number
  /** Speech pitch from 0 to 2. Default is 1. */
  pitch?: number
  /** Speech volume from 0 to 1. Default is 1. */
  volume?: number
}
```

#### `VoiceTranscriptEvent`

A partial speech recognition result with transcript text and confidence.

```typescript
interface VoiceTranscriptEvent {
  /** The recognized text. */
  transcript: string
  /** Whether this is a final (stable) result or an interim (partial) result. */
  isFinal: boolean
  /** Confidence score from 0 to 1, where 1 is highest confidence. */
  confidence: number
}
```

### Types

#### `VoiceState`

The possible states of the voice provider.

```typescript
type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error'
```

### Functions

#### `getProvider()`

Returns the bonded AI voice provider, or `null` if none is registered.

```typescript
function getProvider(): AIVoiceProvider | null
```

**Returns:** The active provider, or `null`.

#### `hasProvider()`

Returns whether an AI voice provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a provider is bonded.

#### `requireProvider()`

Returns the bonded AI voice provider, throwing if none is configured.

```typescript
function requireProvider(): AIVoiceProvider
```

**Returns:** The active provider.

#### `setProvider(provider)`

Registers the AI voice provider singleton.

```typescript
function setProvider(provider: AIVoiceProvider): void
```

- `provider` — The AI voice provider implementation to register.

## Available Providers

| Provider | Package |
|----------|---------|
| Ai Voice | `@molecule/app-ai-voice-default` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`

- **Wire it with THIS package's `setProvider()` or `bond('ai-voice', …)`.**
  `setProvider()` delegates into the shared `@molecule/app-bond` registry, so
  both write the same slot; `requireProvider()` throws until one has run.
- **Feature-detect BEFORE showing voice UI.** The bundled bond
  (`@molecule/app-ai-voice-default`) uses the browser-native Web Speech APIs:
  recognition is missing in several browsers, requires a secure context
  (HTTPS) and microphone permission, and should start only from a user
  gesture. Gate the mic button on `isRecognitionSupported()` and handle the
  `'not-allowed'` error code with a visible message — a silent dead mic
  button is the standard failure.
- Interim transcripts (`isFinal: false`) are UNSTABLE — display them, but only
  act on (submit/save) the final ones.
- `getAvailableVoices()` can be empty until the browser loads voices — await
  it, don't read it synchronously. Call `dispose()` on unmount to release
  recognition instances and listeners.

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
