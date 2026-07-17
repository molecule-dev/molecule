# @molecule/api-ai-speech-openai

OpenAI ai-speech provider for molecule.dev.

Text-to-speech (tts-1 family) plus Whisper speech-to-text: transcription in the
source language and direct speech-to-English translation.

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/api-ai-speech'
import { provider } from '@molecule/api-ai-speech-openai'

setProvider(provider) // at startup — lazy; reads OPENAI_API_KEY on first use

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
import { provider } from '@molecule/api-ai-speech-openai'

export function setupAiSpeechOpenai(): void {
  setProvider(provider)
}
```

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

- **Wiring**: bond the lazy `provider` export once — `setProvider(provider)` — or
  `setProvider(createProvider(config?))` to pass explicit config. Use the core's
  `setProvider`, NOT `bond('ai-speech', …)` (the core keeps its own singleton).
- **Subset**: implements `synthesize`, `transcribe`, and `translate`. It does NOT
  implement `synthesizeSpeech`/`synthesizeStream`/`listVoices` — feature-detect per
  the core; pick `@molecule/api-ai-speech-elevenlabs` for streaming TTS/voice lists.
- Config: `OPENAI_API_KEY` (required, SERVER-side only); `OPENAI_BASE_URL` (optional)
  overrides the API origin, default `https://api.openai.com`.

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
