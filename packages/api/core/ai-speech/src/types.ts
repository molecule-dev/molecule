/**
 * AISpeech provider interface — speech-to-text (STT) and text-to-speech (TTS).
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-speech implementation (ElevenLabs, OpenAI TTS, Google Cloud TTS, etc.).
 *
 * @module
 */

// ---------------------------------------------------------------------------
// TTS (Text-to-Speech)
// ---------------------------------------------------------------------------

/** Audio output format for synthesized speech. */
export type TTSAudioFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm'

/**
 * Supported audio output formats for speech synthesis (provider-specific detailed formats).
 */
export type AudioFormat =
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

/**
 * Parameters for text-to-speech synthesis.
 */
export interface SynthesizeParams {
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

/**
 * Parameters for a text-to-speech synthesis request (ElevenLabs-style).
 */
export interface SpeechParams {
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

/**
 * Result of a text-to-speech synthesis request.
 */
export interface SynthesizeResult {
  /** The synthesized audio data. */
  audio: Uint8Array
  /** MIME content type of the audio (e.g. "audio/mpeg"). */
  contentType: string
}

/**
 * Result of a text-to-speech synthesis request (ElevenLabs-style).
 */
export interface SpeechResult {
  /** The synthesized audio as a Buffer/Uint8Array. */
  audio: Uint8Array
  /** The content type of the audio (e.g. 'audio/mpeg'). */
  contentType: string
}

/**
 * Information about an available voice.
 */
export interface VoiceInfo {
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

// ---------------------------------------------------------------------------
// STT (Speech-to-Text)
// ---------------------------------------------------------------------------

/** Response format for transcription/translation output. */
export type TranscriptionFormat = 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'

/**
 * Parameters for speech-to-text transcription.
 */
export interface TranscribeParams {
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
  /**
   * Label who is speaking (speaker diarization), if the provider supports it.
   * Speaker labels land on `words[].speaker` / `segments[].speaker`.
   */
  diarize?: boolean
  /** Upper bound on the number of distinct speakers to label (diarization only). */
  maxSpeakers?: number
}

/**
 * A segment of transcribed audio with timestamps.
 */
export interface TranscriptionSegment {
  /** Segment index. */
  id: number
  /** Start time in seconds. */
  start: number
  /** End time in seconds. */
  end: number
  /** Transcribed text for this segment. */
  text: string
  /**
   * Normalized speaker label (e.g. `"speaker_0"`) when diarization was
   * requested. Labels are per call: `speaker_0` in one result is not the same
   * person as `speaker_0` in another.
   */
  speaker?: string
}

/**
 * A single word with timestamp information.
 */
export interface TranscriptionWord {
  /** The transcribed word. */
  word: string
  /** Start time in seconds. */
  start: number
  /** End time in seconds. */
  end: number
  /** Normalized speaker label (e.g. `"speaker_0"`) when diarization was requested. */
  speaker?: string
}

// ---------------------------------------------------------------------------
// Streaming STT
// ---------------------------------------------------------------------------

/**
 * Parameters for streaming speech-to-text.
 *
 * The audio passed alongside these params is raw PCM16 little-endian MONO at
 * `sampleRate` Hz — not a WAV/webm/m4a container.
 */
export interface TranscribeStreamParams {
  /** Sample rate of the PCM16 input in Hz. Defaults to 16000. */
  sampleRate?: number
  /** Language of the input audio (provider-specific code, usually ISO 639-1). */
  language?: string
  /** Model to use (provider-specific). */
  model?: string
  /** Optional context / hotword prompt, where the provider supports one. */
  prompt?: string
  /** Label who is speaking, where the provider supports it in streaming mode. */
  diarize?: boolean
  /** Cancels the stream: the provider closes its connection and the iterable ends. */
  signal?: AbortSignal
}

/**
 * An event from a streaming transcription.
 *
 * Text arrives as increments that build up the CURRENT segment:
 * - `partial` — a provisional increment that the next `final` may revise.
 * - `delta` — an append-only increment that will never change.
 * - `final` — the complete, settled text of the current segment. It REPLACES
 *   the increments received since the previous `final` (for append-only
 *   providers it equals their concatenation), then a new segment begins.
 * - `turn-end` — the provider detected the end of a speaker turn or a segment
 *   boundary.
 * - `error` — the stream failed; no further events follow.
 */
export type TranscriptionStreamEvent =
  | { type: 'partial'; text: string }
  | { type: 'delta'; text: string }
  | { type: 'final'; text: string; words?: TranscriptionWord[] }
  | { type: 'turn-end' }
  | { type: 'error'; message: string }

// ---------------------------------------------------------------------------
// Diarization (who spoke when)
// ---------------------------------------------------------------------------

/**
 * Parameters for speaker diarization without transcription.
 */
export interface DiarizeParams {
  /** Audio data to diarize. */
  audio: Uint8Array | Buffer
  /** Filename hint for the audio (helps with format detection). */
  filename?: string
  /** Upper bound on the number of distinct speakers to label. */
  maxSpeakers?: number
}

/**
 * A span of audio attributed to one speaker.
 */
export interface DiarizationSegment {
  /** Start time in seconds. */
  start: number
  /** End time in seconds. */
  end: number
  /** Normalized speaker label (e.g. `"speaker_0"`), per call. */
  speaker: string
}

/**
 * Result of a diarization request.
 */
export interface DiarizeResult {
  /** Speaker spans in time order. */
  segments: DiarizationSegment[]
}

/**
 * Result of a speech-to-text transcription.
 */
export interface TranscribeResult {
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

// ---------------------------------------------------------------------------
// Translation (audio → English text)
// ---------------------------------------------------------------------------

/**
 * Parameters for speech translation (audio in any language → English text).
 */
export interface TranslateParams {
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

/**
 * Result of a speech translation request.
 */
export interface TranslateResult {
  /** The translated English text. */
  text: string
  /** Detected source language (ISO 639-1 code). */
  language?: string
  /** Duration of the audio in seconds. */
  duration?: number
  /** Segment-level breakdown with timestamps. */
  segments?: TranscriptionSegment[]
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * AISpeech provider interface.
 *
 * Providers implement text-to-speech synthesis, speech-to-text transcription,
 * and optional audio translation capabilities.
 */
export interface AISpeechProvider {
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

  /**
   * Whether `transcribeStream` text is append-only: `true` means text already
   * emitted never changes (the provider emits `delta` events), `false` or
   * absent means shown text may be revised by a later `final`.
   */
  readonly streamingAppendOnly?: boolean

  /**
   * Transcribe live audio as it arrives.
   *
   * @param audio - Raw PCM16 little-endian mono chunks at `params.sampleRate` Hz.
   * @param params - Streaming parameters (sample rate, language, abort signal).
   * @returns Async iterable of transcription events; ends after the last `final` or an `error`.
   */
  transcribeStream?(
    audio: AsyncIterable<Uint8Array>,
    params?: TranscribeStreamParams,
  ): AsyncIterable<TranscriptionStreamEvent>

  /**
   * Label who spoke when, without transcribing.
   *
   * @param params - Diarization parameters including audio data.
   * @returns Speaker spans with normalized per-call labels.
   */
  diarize?(params: DiarizeParams): Promise<DiarizeResult>
}

/**
 * Base configuration for speech providers.
 */
export interface AISpeechConfig {
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
