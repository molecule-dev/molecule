# @molecule/app-ai-voice-default

Default ai-voice provider for molecule.dev — browser Web Speech API for
speech-to-text (SpeechRecognition) and text-to-speech (SpeechSynthesis).

## Quick Start

```typescript
import { setProvider } from '@molecule/app-ai-voice'
import { createProvider } from '@molecule/app-ai-voice-default'

// There is NO pre-instantiated `provider` export in this package —
// wire the factory result:
setProvider(createProvider()) // at startup
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

## Core Interface
Implements `@molecule/app-ai-voice` interface.

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
