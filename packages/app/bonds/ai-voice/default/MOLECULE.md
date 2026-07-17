# @molecule/app-ai-voice-default

Default ai-voice provider for molecule.dev — browser Web Speech API for
speech-to-text (SpeechRecognition) and text-to-speech (SpeechSynthesis).

## Quick Start

```typescript
import { setProvider } from '@molecule/app-ai-voice'
import { provider } from '@molecule/app-ai-voice-default'

setProvider(provider) // at startup — lazy; no config needed
// setProvider(createProvider({ ... })) to pass default recognition/synthesis options
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ai-voice-default @molecule/app-ai-voice
```

## API

### Interfaces

#### `DefaultVoiceConfig`

Configuration specific to the default Web Speech API voice provider.
Extends the base AIVoiceConfig with Web Speech API-specific options.

```typescript
interface DefaultVoiceConfig extends AIVoiceConfig {
  /**
   * When true, immediately restarts recognition after it ends
   * (e.g. due to silence timeout) in continuous mode.
   * Defaults to true.
   */
  autoRestart?: boolean
}
```

### Classes

#### `DefaultVoiceProvider`

Default voice provider implementation using the browser Web Speech API.

Provides speech-to-text via SpeechRecognition and text-to-speech via
SpeechSynthesis. Falls back gracefully when APIs are unavailable.

### Functions

#### `createProvider(config)`

Creates a DefaultVoiceProvider instance.

```typescript
function createProvider(config?: DefaultVoiceConfig): DefaultVoiceProvider
```

- `config` — Optional configuration with default recognition/synthesis options.

**Returns:** A DefaultVoiceProvider that uses the browser Web Speech API.

### Constants

#### `provider`

The provider implementation — the fleet-standard typed `provider` const.

Wire it once at startup: `setProvider(provider)` from `@molecule/app-ai-voice`.
It is a lazy proxy: construction is deferred to the first property access, so
importing this module never throws and needs no config up front. Use
`createProvider(config)` instead when you need default recognition/synthesis options.

```typescript
const provider: AIVoiceProvider
```

## Core Interface
Implements `@molecule/app-ai-voice` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-ai-voice'
import { provider } from '@molecule/app-ai-voice-default'

export function setupAiVoiceDefault(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ai-voice` ^1.0.0

### Runtime Dependencies

- `@molecule/app-ai-voice`

Failure modes are asymmetric: when recognition is unsupported,
`startListening()` reports `{ code: 'not-supported' }` through
`handlers.onError` and returns — but when synthesis is unsupported,
`speak()` THROWS. Feature-detect with `isRecognitionSupported()` /
`isSynthesisSupported()` and wrap `speak()` in try/catch.
`speak()` cancels any utterance already playing. `autoRestart`
(default true) only applies with `continuous: true`, where transient
`'no-speech'` ends are swallowed and listening resumes automatically —
call `stopListening()` to actually stop. `options.voice` matches by voice
`name` or `voiceURI` from `getAvailableVoices()`.

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
