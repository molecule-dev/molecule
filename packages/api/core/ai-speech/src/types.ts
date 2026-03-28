/**
 * AISpeech provider interface — speech-to-text (STT) and text-to-speech (TTS).
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-speech implementation.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// TTS (Text-to-Speech)
// ---------------------------------------------------------------------------

/** Audio output format for synthesized speech. */
export type TTSAudioFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm'

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
 * Result of a text-to-speech synthesis request.
 */
export interface SynthesizeResult {
  /** The synthesized audio data. */
  audio: Uint8Array
  /** MIME content type of the audio (e.g. "audio/mpeg"). */
  contentType: string
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
  synthesize(params: SynthesizeParams): Promise<SynthesizeResult>

  /**
   * Transcribe audio to text in the original language.
   *
   * @param params - Transcription parameters including audio data, model, and language.
   * @returns Transcribed text with optional timestamps and metadata.
   */
  transcribe(params: TranscribeParams): Promise<TranscribeResult>

  /**
   * Translate audio from any language to English text.
   *
   * @param params - Translation parameters including audio data and model.
   * @returns Translated English text with optional metadata.
   */
  translate(params: TranslateParams): Promise<TranslateResult>
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
  /** Base URL override (for proxies or self-hosted endpoints). */
  baseUrl?: string
  /** Additional provider-specific options. */
  [key: string]: unknown
}
