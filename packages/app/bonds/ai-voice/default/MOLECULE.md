# @molecule/app-ai-voice-default

Default ai-voice provider for molecule.dev — uses the browser Web Speech API
for speech-to-text (SpeechRecognition) and text-to-speech (SpeechSynthesis).

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ai-voice-default
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ai-voice` ^1.0.0
