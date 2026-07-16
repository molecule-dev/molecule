# @molecule/api-ai-speech-elevenlabs

ElevenLabs ai-speech provider for molecule.dev.

Text-to-speech via the ElevenLabs API: high-quality single-shot synthesis,
chunked streaming synthesis, and voice listing.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-speech-elevenlabs @molecule/api-ai-speech @molecule/api-secrets
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

#### `aiSpeechElevenlabsSecretDefinitions`

Secret definitions required by the ElevenLabs speech bond.

```typescript
const aiSpeechElevenlabsSecretDefinitions: SecretDefinition[]
```

#### `provider`

The provider implementation.

```typescript
const provider: AISpeechProvider
```

## Core Interface
Implements `@molecule/api-ai-speech` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-ai-speech'
import { provider } from '@molecule/api-ai-speech-elevenlabs'

export function setupAiSpeechElevenlabs(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-speech` >=1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `ELEVENLABS_API_KEY` *(required)* — ElevenLabs API key
  - Setup: Create an API key in ElevenLabs under Settings → API keys.
  - Get it here: [https://elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys)
  - Example: `sk_...`

### Runtime Dependencies

- `@molecule/api-ai-speech`
- `@molecule/api-secrets`

- **TTS-only subset**: implements `synthesizeSpeech(SpeechParams)`, `synthesizeStream`,
  and `listVoices`. It does NOT implement `synthesize` (the other TTS dialect),
  `transcribe`, or `translate` — feature-detect per the `@molecule/api-ai-speech` core
  and pair with an STT-capable provider (e.g. `@molecule/api-ai-speech-openai`) when
  the app needs transcription.
- Config: `ELEVENLABS_API_KEY` (required, SERVER-side only); `ELEVENLABS_BASE_URL`
  (optional) overrides the API origin (proxies/gateways), default
  `https://api.elevenlabs.io`.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip.
The wired provider implements a subset (TTS, STT, or both) — feature-detect
and run only the direction(s) it actually exposes:
- [ ] TTS: each read-aloud / narration / voice-note flow the app defines
  returns real PLAYABLE audio — the response carries an audio Content-Type
  (e.g. `audio/mpeg`) and non-trivial bytes (not a 0-byte file, not a
  JSON-encoded blob), and the UI's `<audio>`/player actually plays it. The
  spoken audio reflects the input text you sent.
- [ ] TTS: synthesizing two different strings yields two audibly different
  clips (distinct byte payloads) — proves the text drives synthesis and you
  are not hearing a cached/placeholder file.
- [ ] TTS: any exposed voice/format/speed option takes effect — switching
  voice (`voice`/`voiceId`) or output format (`responseFormat`/
  `outputFormat`) changes the returned audio (audible voice, Content-Type,
  or file extension); an unknown voice/format surfaces a visible error
  rather than silently falling back.
- [ ] STT: transcribing a KNOWN spoken clip returns text that MATCHES the
  words spoken (not empty, not garbage) and renders in the UI; translating
  a non-English clip returns English text. Any timestamps the UI shows line
  up with the audio.
- [ ] STT: a silent / empty / too-short clip is handled gracefully — an
  empty or "no speech detected" result shown in the UI, never a crash or a
  spinner that hangs forever.
- [ ] The audio artifact is served from the app's OWN origin (a stored
  upload or a route the app serves), NOT a raw expiring provider URL — copy
  the audio src, reload it later, and confirm it still plays.
- [ ] A provider error (bad key, quota, unsupported format/voice, or a
  capability the wired provider lacks) surfaces as a readable message in the
  UI, not an unhandled crash or a blank/broken player.
- [ ] Synthesis/transcription runs SERVER-SIDE and authorized: the provider
  key never reaches the browser (check the network tab / client bundle), and
  no unauthenticated or unbounded endpoint lets a caller fire arbitrary
  synthesize/transcribe calls — each is billed per character / per minute of
  audio, so an open endpoint is a cost-DoS vector.
