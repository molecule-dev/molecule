# @molecule/api-ai-speech

ai-speech core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-speech
```

## API

### Interfaces

#### `AISpeechConfig`

Base configuration for speech providers.

```typescript
interface AISpeechConfig {
  /** API key for the speech service. */
  apiKey?: string
  /** Default model for text-to-speech. */
  defaultTTSModel?: string
  /** Default model for speech-to-text. */
  defaultSTTModel?: string
  /** Default voice for text-to-speech. */
  defaultVoice?: string
  /** Default voice ID to use when not specified in params. */
  defaultVoiceId?: string
  /** Default model to use when not specified in params. */
  defaultModel?: string
  /** Base URL override (for proxies or self-hosted endpoints). */
  baseUrl?: string
  /** Additional provider-specific options. */
  [key: string]: unknown
}
```

#### `AISpeechProvider`

AISpeech provider interface.

Providers implement text-to-speech synthesis, speech-to-text transcription,
and optional audio translation capabilities.

```typescript
interface AISpeechProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Convert text to speech audio.
   *
   * @param params - Synthesis parameters including text, voice, and format.
   * @returns Synthesized audio data with content type.
   */
  synthesize?(params: SynthesizeParams): Promise<SynthesizeResult>

  /**
   * Synthesize speech from text (ElevenLabs-style params).
   *
   * @param params - Speech synthesis parameters.
   * @returns The synthesized audio data with content type metadata.
   */
  synthesizeSpeech?(params: SpeechParams): Promise<SpeechResult>

  /**
   * Stream synthesized speech from text.
   *
   * Returns an async iterable of audio chunks for real-time playback.
   *
   * @param params - Speech synthesis parameters.
   * @returns Async iterable of audio data chunks.
   */
  synthesizeStream?(params: SpeechParams): AsyncIterable<Uint8Array>

  /**
   * List available voices from this provider.
   *
   * @returns Array of available voice information.
   */
  listVoices?(): Promise<VoiceInfo[]>

  /**
   * Transcribe audio to text in the original language.
   *
   * @param params - Transcription parameters including audio data, model, and language.
   * @returns Transcribed text with optional timestamps and metadata.
   */
  transcribe?(params: TranscribeParams): Promise<TranscribeResult>

  /**
   * Translate audio from any language to English text.
   * Optional — not all providers support STT (e.g., ElevenLabs is TTS-only).
   *
   * @param params - Translation parameters including audio data and model.
   * @returns Translated English text with optional metadata.
   */
  translate?(params: TranslateParams): Promise<TranslateResult>
}
```

#### `SpeechParams`

Parameters for a text-to-speech synthesis request (ElevenLabs-style).

```typescript
interface SpeechParams {
  /** The text to synthesize into speech. */
  text: string
  /** Voice identifier (provider-specific). */
  voiceId: string
  /** Model to use for synthesis. Provider chooses default if omitted. */
  model?: string
  /** Output audio format. Provider chooses default if omitted. */
  outputFormat?: AudioFormat | string
  /** Voice stability (0.0–1.0). Higher = more consistent, lower = more expressive. */
  stability?: number
  /** Similarity boost (0.0–1.0). Higher = closer to original voice. */
  similarityBoost?: number
  /** Style exaggeration (0.0–1.0). Higher = more stylized delivery. */
  style?: number
  /** Whether to use the speaker boost feature. */
  useSpeakerBoost?: boolean
  /** Speaking speed multiplier. 1.0 = normal speed. */
  speed?: number
  /** BCP-47 language code for multilingual models. */
  languageCode?: string
}
```

#### `SpeechResult`

Result of a text-to-speech synthesis request (ElevenLabs-style).

```typescript
interface SpeechResult {
  /** The synthesized audio as a Buffer/Uint8Array. */
  audio: Uint8Array
  /** The content type of the audio (e.g. 'audio/mpeg'). */
  contentType: string
}
```

#### `SynthesizeParams`

Parameters for text-to-speech synthesis.

```typescript
interface SynthesizeParams {
  /** The text to convert to speech. */
  input: string
  /** Voice identifier (provider-specific). */
  voice?: string
  /** Model to use for synthesis (provider-specific). */
  model?: string
  /** Desired audio output format. */
  responseFormat?: TTSAudioFormat
  /** Speech speed multiplier (e.g. 0.5 = half speed, 2.0 = double speed). */
  speed?: number
  /** Optional instructions to guide voice style/tone (if supported by model). */
  instructions?: string
}
```

#### `SynthesizeResult`

Result of a text-to-speech synthesis request.

```typescript
interface SynthesizeResult {
  /** The synthesized audio data. */
  audio: Uint8Array
  /** MIME content type of the audio (e.g. "audio/mpeg"). */
  contentType: string
}
```

#### `TranscribeParams`

Parameters for speech-to-text transcription.

```typescript
interface TranscribeParams {
  /** Audio data to transcribe. */
  audio: Uint8Array | Buffer
  /** Filename hint for the audio (helps with format detection). Defaults to 'audio.wav'. */
  filename?: string
  /** Model to use for transcription (provider-specific). */
  model?: string
  /** Language of the input audio (ISO 639-1 code, e.g. "en"). */
  language?: string
  /** Optional prompt to guide the transcription (context or spelling hints). */
  prompt?: string
  /** Sampling temperature (0–1). Lower = more deterministic. */
  temperature?: number
  /** Desired response format. Defaults to 'json'. */
  responseFormat?: TranscriptionFormat
  /** Whether to include word-level timestamps (if supported). */
  timestampGranularity?: 'word' | 'segment' | 'both'
}
```

#### `TranscribeResult`

Result of a speech-to-text transcription.

```typescript
interface TranscribeResult {
  /** The full transcribed text. */
  text: string
  /** Detected or specified language (ISO 639-1 code). */
  language?: string
  /** Duration of the audio in seconds. */
  duration?: number
  /** Segment-level breakdown with timestamps. */
  segments?: TranscriptionSegment[]
  /** Word-level breakdown with timestamps. */
  words?: TranscriptionWord[]
}
```

#### `TranscriptionSegment`

A segment of transcribed audio with timestamps.

```typescript
interface TranscriptionSegment {
  /** Segment index. */
  id: number
  /** Start time in seconds. */
  start: number
  /** End time in seconds. */
  end: number
  /** Transcribed text for this segment. */
  text: string
}
```

#### `TranscriptionWord`

A single word with timestamp information.

```typescript
interface TranscriptionWord {
  /** The transcribed word. */
  word: string
  /** Start time in seconds. */
  start: number
  /** End time in seconds. */
  end: number
}
```

#### `TranslateParams`

Parameters for speech translation (audio in any language → English text).

```typescript
interface TranslateParams {
  /** Audio data to translate. */
  audio: Uint8Array | Buffer
  /** Filename hint for the audio. Defaults to 'audio.wav'. */
  filename?: string
  /** Model to use for translation (provider-specific). */
  model?: string
  /** Optional prompt to guide the translation. */
  prompt?: string
  /** Sampling temperature (0–1). */
  temperature?: number
  /** Desired response format. Defaults to 'json'. */
  responseFormat?: TranscriptionFormat
}
```

#### `TranslateResult`

Result of a speech translation request.

```typescript
interface TranslateResult {
  /** The translated English text. */
  text: string
  /** Detected source language (ISO 639-1 code). */
  language?: string
  /** Duration of the audio in seconds. */
  duration?: number
  /** Segment-level breakdown with timestamps. */
  segments?: TranscriptionSegment[]
}
```

#### `VoiceInfo`

Information about an available voice.

```typescript
interface VoiceInfo {
  /** Provider-specific voice identifier. */
  voiceId: string
  /** Human-readable voice name. */
  name: string
  /** Voice category (e.g. 'premade', 'cloned', 'generated'). */
  category?: string
  /** Labels/tags associated with the voice (e.g. accent, gender, age). */
  labels?: Record<string, string>
  /** ISO language codes this voice supports. */
  languages?: string[]
  /** URL to a preview/sample of this voice, if available. */
  previewUrl?: string
}
```

### Types

#### `AudioFormat`

Supported audio output formats for speech synthesis (provider-specific detailed formats).

```typescript
type AudioFormat =
  | 'mp3_44100_128'
  | 'mp3_44100_192'
  | 'mp3_22050_32'
  | 'pcm_16000'
  | 'pcm_22050'
  | 'pcm_24000'
  | 'pcm_44100'
  | 'ulaw_8000'
  | 'opus'
  | 'aac'
  | 'flac'
```

#### `TranscriptionFormat`

Response format for transcription/translation output.

```typescript
type TranscriptionFormat = 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'
```

#### `TTSAudioFormat`

Audio output format for synthesized speech.

```typescript
type TTSAudioFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm'
```

### Functions

#### `getProvider()`

Get the registered AISpeech provider, or null if none is registered.

```typescript
function getProvider(): AISpeechProvider | null
```

**Returns:** The registered provider, or null.

#### `hasProvider()`

Check whether an AISpeech provider is registered.

```typescript
function hasProvider(): boolean
```

**Returns:** True if a provider has been registered.

#### `requireProvider()`

Get the registered AISpeech provider, throwing if none is registered.

```typescript
function requireProvider(): AISpeechProvider
```

**Returns:** The registered provider.

#### `setProvider(provider)`

Register an AISpeech provider implementation.

```typescript
function setProvider(provider: AISpeechProvider): void
```

- `provider` — The speech provider to register.
