# @molecule/api-ai-speech-openai

OpenAI ai-speech provider for molecule.dev.

Text-to-speech (tts-1 family) plus Whisper speech-to-text: transcription in the
source language and direct speech-to-English translation.

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/api-ai-speech'
import { createProvider } from '@molecule/api-ai-speech-openai'

// This bond exports NO `provider` const — wire the factory (reads OPENAI_API_KEY):
setProvider(createProvider())

const speech = requireProvider()
const { audio, contentType } = await speech.synthesize({ input: 'Hello!', voice: 'alloy' })
const { text } = await speech.transcribe!({ audio: buf, model: 'whisper-1' })
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-speech-openai @molecule/api-ai-speech @molecule/api-secrets
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

### Constants

#### `aiSpeechOpenaiSecretDefinitions`

Secret definitions required by the OpenAI speech bond.

```typescript
const aiSpeechOpenaiSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-ai-speech` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-speech` >=1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `OPENAI_API_KEY` *(required)* — OpenAI API key
  - Setup: Create a secret key on the OpenAI platform (API keys page).
  - Get it here: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - Example: `sk-proj-...`

### Runtime Dependencies

- `@molecule/api-ai-speech`
- `@molecule/api-secrets`

- **Wiring**: unlike sibling bonds there is no lazy `provider` export — call
  `setProvider(createProvider(config?))`. Use the core's `setProvider`, NOT
  `bond('ai-speech', …)` (the core keeps its own singleton).
- **Subset**: implements `synthesize`, `transcribe`, and `translate`. It does NOT
  implement `synthesizeSpeech`/`synthesizeStream`/`listVoices` — feature-detect per
  the core; pick `@molecule/api-ai-speech-elevenlabs` for streaming TTS/voice lists.
- Config: `OPENAI_API_KEY` (required, SERVER-side only); `OPENAI_BASE_URL` (optional)
  overrides the API origin, default `https://api.openai.com`.
