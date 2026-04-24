# @molecule/api-ai-speech-elevenlabs

ElevenLabs ai-speech provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-speech-elevenlabs
```

## API

### Interfaces

#### `ElevenlabsConfig`

Configuration for the ElevenLabs speech provider.

```typescript
interface ElevenlabsConfig {
  /** ElevenLabs API key. Defaults to ELEVENLABS_API_KEY env var. */
  apiKey?: string
  /** Default voice ID. Defaults to 'JBFqnCBsd6RMkjVDRZzb' (George). */
  defaultVoiceId?: string
  /** Default model for synthesis. Defaults to 'eleven_multilingual_v2'. */
  defaultModel?: string
  /** Base URL for the ElevenLabs API. Defaults to 'https://api.elevenlabs.io'. */
  baseUrl?: string
  /** Default output format. Defaults to 'mp3_44100_128'. */
  defaultOutputFormat?: string
  /** Default voice stability (0.0–1.0). Defaults to 0.5. */
  defaultStability?: number
  /** Default similarity boost (0.0–1.0). Defaults to 0.75. */
  defaultSimilarityBoost?: number
}
```

#### `ElevenLabsErrorResponse`

Shape of an ElevenLabs API error response.

```typescript
interface ElevenLabsErrorResponse {
  detail?: {
    status?: string
    message?: string
  }
}
```

#### `ElevenLabsVoice`

Shape of a voice object in the ElevenLabs API response.

```typescript
interface ElevenLabsVoice {
  voice_id: string
  name: string
  category?: string
  labels?: Record<string, string>
  preview_url?: string
  available_for_tiers?: string[]
  fine_tuning?: Record<string, unknown>
}
```

#### `ElevenLabsVoicesResponse`

Shape of the ElevenLabs voices list API response.

```typescript
interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[]
}
```

### Functions

#### `createProvider(config)`

Creates an ElevenLabs speech provider instance.

```typescript
function createProvider(config?: ElevenlabsConfig): AISpeechProvider
```

- `config` — ElevenLabs-specific configuration (API key, voice, model, base URL).

**Returns:** An `AISpeechProvider` backed by the ElevenLabs Text-to-Speech API.

### Constants

#### `provider`

The provider implementation.

```typescript
const provider: AISpeechProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-speech` >=1.0.0
