/**
 * AISpeech provider interface — text-to-speech synthesis.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-speech implementation (ElevenLabs, OpenAI TTS, Google Cloud TTS, etc.).
 *
 * @module
 */

/**
 * Supported audio output formats for speech synthesis.
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
 * Parameters for a text-to-speech synthesis request.
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

/**
 * AISpeech provider interface.
 *
 * All speech provider bonds must implement this interface.
 */
export interface AISpeechProvider {
  /** Provider identifier (e.g. 'elevenlabs', 'openai'). */
  readonly name: string

  /**
   * Synthesize speech from text.
   *
   * @param params - Speech synthesis parameters.
   * @returns The synthesized audio data with content type metadata.
   */
  synthesize(params: SpeechParams): Promise<SpeechResult>

  /**
   * Stream synthesized speech from text.
   *
   * Returns an async iterable of audio chunks for real-time playback.
   *
   * @param params - Speech synthesis parameters.
   * @returns Async iterable of audio data chunks.
   */
  synthesizeStream(params: SpeechParams): AsyncIterable<Uint8Array>

  /**
   * List available voices from this provider.
   *
   * @returns Array of available voice information.
   */
  listVoices(): Promise<VoiceInfo[]>
}

/**
 * Configuration shared by all AISpeech providers.
 */
export interface AISpeechConfig {
  /** API key for the speech provider. */
  apiKey?: string
  /** Default voice ID to use when not specified in params. */
  defaultVoiceId?: string
  /** Default model to use when not specified in params. */
  defaultModel?: string
}
