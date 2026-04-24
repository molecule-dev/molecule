# @molecule/api-ai-speech-openai

Openai ai-speech-openai provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-speech-openai
```

## API

### Interfaces

#### `OpenaiSpeechConfig`

Configuration for the OpenAI speech provider.

```typescript
interface OpenaiSpeechConfig {
  /** OpenAI API key. Defaults to OPENAI_API_KEY env var. */
  apiKey?: string
  /** Base URL for the OpenAI API. Defaults to 'https://api.openai.com'. */
  baseUrl?: string
  /** Default TTS model. Defaults to 'tts-1'. */
  defaultTTSModel?: string
  /** Default STT model. Defaults to 'whisper-1'. */
  defaultSTTModel?: string
  /** Default voice for TTS. Defaults to 'alloy'. */
  defaultVoice?: string
  /** Default audio output format for TTS. Defaults to 'mp3'. */
  defaultResponseFormat?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm'
  /** Default speech speed for TTS (0.25–4.0). Defaults to 1.0. */
  defaultSpeed?: number
}
```

### Functions

#### `createProvider(config)`

Creates an OpenAI speech provider instance.

```typescript
function createProvider(config?: OpenaiSpeechConfig): AISpeechProvider
```

- `config` — OpenAI-specific configuration (API key, models, voice, base URL).

**Returns:** An `AISpeechProvider` backed by OpenAI TTS and Whisper APIs.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-speech` >=1.0.0
