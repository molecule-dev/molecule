/**
 * OpenAI speech provider configuration.
 *
 * @module
 */

/**
 * Configuration for the OpenAI speech provider.
 */
export interface OpenaiSpeechConfig {
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
