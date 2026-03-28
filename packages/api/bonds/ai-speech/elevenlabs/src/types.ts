/**
 * ElevenLabs speech provider configuration.
 *
 * @module
 */

/**
 * Configuration for the ElevenLabs speech provider.
 */
export interface ElevenlabsConfig {
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

/** Shape of a voice object in the ElevenLabs API response. */
export interface ElevenLabsVoice {
  voice_id: string
  name: string
  category?: string
  labels?: Record<string, string>
  preview_url?: string
  available_for_tiers?: string[]
  fine_tuning?: Record<string, unknown>
}

/** Shape of the ElevenLabs voices list API response. */
export interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[]
}

/** Shape of an ElevenLabs API error response. */
export interface ElevenLabsErrorResponse {
  detail?: {
    status?: string
    message?: string
  }
}
