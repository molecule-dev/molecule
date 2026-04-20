/**
 * ElevenLabs implementation of AISpeechProvider.
 *
 * Uses the ElevenLabs Text-to-Speech API to synthesize natural-sounding
 * speech from text. Supports multiple voices, models, and output formats.
 *
 * @module
 */

import type {
  AISpeechProvider,
  SpeechParams,
  SpeechResult,
  VoiceInfo,
} from '@molecule/api-ai-speech'

import type {
  ElevenlabsConfig,
  ElevenLabsErrorResponse,
  ElevenLabsVoicesResponse,
} from './types.js'

/** Map of output format to MIME content type. */
const FORMAT_CONTENT_TYPES: Record<string, string> = {
  mp3_44100_128: 'audio/mpeg',
  mp3_44100_192: 'audio/mpeg',
  mp3_22050_32: 'audio/mpeg',
  pcm_16000: 'audio/pcm',
  pcm_22050: 'audio/pcm',
  pcm_24000: 'audio/pcm',
  pcm_44100: 'audio/pcm',
  ulaw_8000: 'audio/basic',
  opus: 'audio/opus',
  aac: 'audio/aac',
  flac: 'audio/flac',
}

/**
 * ElevenLabs speech provider that implements the `AISpeechProvider` interface
 * using the ElevenLabs Text-to-Speech API with support for multiple voices,
 * models, and streaming.
 */
class ElevenlabsSpeechProvider implements AISpeechProvider {
  readonly name = 'elevenlabs'
  private apiKey: string
  private defaultVoiceId: string
  private defaultModel: string
  private baseUrl: string
  private defaultOutputFormat: string
  private defaultStability: number
  private defaultSimilarityBoost: number

  /**
   * Creates a new ElevenLabs speech provider.
   *
   * @param config - Provider configuration. API key defaults to ELEVENLABS_API_KEY env var.
   */
  constructor(config: ElevenlabsConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.ELEVENLABS_API_KEY ?? ''
    this.defaultVoiceId = config.defaultVoiceId ?? 'JBFqnCBsd6RMkjVDRZzb'
    this.defaultModel = config.defaultModel ?? 'eleven_multilingual_v2'
    this.baseUrl = config.baseUrl ?? 'https://api.elevenlabs.io'
    this.defaultOutputFormat = config.defaultOutputFormat ?? 'mp3_44100_128'
    this.defaultStability = config.defaultStability ?? 0.5
    this.defaultSimilarityBoost = config.defaultSimilarityBoost ?? 0.75
  }

  /**
   * Synthesize speech from text using the ElevenLabs TTS API.
   *
   * Returns the complete audio as a Uint8Array buffer.
   *
   * @param params - Speech synthesis parameters.
   * @returns The synthesized audio data with content type.
   */
  async synthesize(params: SpeechParams): Promise<SpeechResult> {
    const voiceId = params.voiceId || this.defaultVoiceId
    const outputFormat = params.outputFormat ?? this.defaultOutputFormat
    const url = `${this.baseUrl}/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`

    const body = this.buildRequestBody(params)
    const response = await this.callApi(url, body)

    const arrayBuffer = await response.arrayBuffer()

    return {
      audio: new Uint8Array(arrayBuffer),
      contentType: FORMAT_CONTENT_TYPES[outputFormat] ?? 'audio/mpeg',
    }
  }

  /**
   * Stream synthesized speech from text using the ElevenLabs streaming TTS API.
   *
   * Yields audio data chunks as they arrive for real-time playback.
   *
   * @param params - Speech synthesis parameters.
   * @yields {Uint8Array} Audio chunk bytes as they arrive from the stream.
   */
  async *synthesizeStream(params: SpeechParams): AsyncIterable<Uint8Array> {
    const voiceId = params.voiceId || this.defaultVoiceId
    const outputFormat = params.outputFormat ?? this.defaultOutputFormat
    const url = `${this.baseUrl}/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=${encodeURIComponent(outputFormat)}`

    const body = this.buildRequestBody(params)
    const response = await this.callApi(url, body)

    if (!response.body) {
      throw new Error('ElevenLabs API returned no response body for streaming')
    }

    const reader = (response.body as ReadableStream<Uint8Array>).getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        yield value
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * List available voices from the ElevenLabs API.
   *
   * @returns Array of available voice information.
   */
  async listVoices(): Promise<VoiceInfo[]> {
    const headers: Record<string, string> = {
      'xi-api-key': this.apiKey,
    }

    const MAX_RETRIES = 3
    let response: Response | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(`${this.baseUrl}/v1/voices`, {
        method: 'GET',
        headers,
      })

      if (response.status === 429 || response.status === 503) {
        if (attempt < MAX_RETRIES) {
          const retryAfter = response.headers.get('retry-after')
          const delayMs = retryAfter
            ? Math.min(parseInt(retryAfter, 10) * 1000, 60_000)
            : Math.min(1000 * 2 ** attempt, 30_000)
          await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
          continue
        }
      }
      break
    }

    if (!response!.ok) {
      await this.throwApiError(response!)
    }

    const data = (await response!.json()) as ElevenLabsVoicesResponse

    return data.voices.map((voice) => ({
      voiceId: voice.voice_id,
      name: voice.name,
      category: voice.category,
      labels: voice.labels,
      previewUrl: voice.preview_url,
    }))
  }

  /**
   * Build the JSON request body for the ElevenLabs TTS endpoint.
   *
   * @param params - Speech synthesis parameters.
   * @returns The request body object.
   */
  private buildRequestBody(params: SpeechParams): Record<string, unknown> {
    const voiceSettings: Record<string, unknown> = {
      stability: params.stability ?? this.defaultStability,
      similarity_boost: params.similarityBoost ?? this.defaultSimilarityBoost,
    }

    if (params.style !== undefined) {
      voiceSettings.style = params.style
    }

    if (params.useSpeakerBoost !== undefined) {
      voiceSettings.use_speaker_boost = params.useSpeakerBoost
    }

    if (params.speed !== undefined) {
      voiceSettings.speed = params.speed
    }

    const body: Record<string, unknown> = {
      text: params.text,
      model_id: params.model ?? this.defaultModel,
      voice_settings: voiceSettings,
    }

    if (params.languageCode) {
      body.language_code = params.languageCode
    }

    return body
  }

  /**
   * Makes an API call with retry logic for rate-limit and server errors.
   *
   * @param url - The API endpoint URL.
   * @param body - The request body.
   * @returns The successful response.
   * @throws {Error} on non-retryable API errors or after exhausting retries.
   */
  private async callApi(url: string, body: Record<string, unknown>): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'xi-api-key': this.apiKey,
    }

    const MAX_RETRIES = 3
    let response: Response | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (response.status === 429 || response.status === 503) {
        if (attempt < MAX_RETRIES) {
          const retryAfter = response.headers.get('retry-after')
          const delayMs = retryAfter
            ? Math.min(parseInt(retryAfter, 10) * 1000, 60_000)
            : Math.min(1000 * 2 ** attempt, 30_000)
          await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
          continue
        }
      }
      break
    }

    if (!response!.ok) {
      await this.throwApiError(response!)
    }

    return response!
  }

  /**
   * Parse an error response from the ElevenLabs API and throw a descriptive error.
   *
   * @param response - The failed API response.
   * @throws {Error} with a descriptive message.
   */
  private async throwApiError(response: Response): Promise<never> {
    const errorBody = await response.text()
    let detail = `HTTP ${response.status}`
    try {
      const parsed = JSON.parse(errorBody) as ElevenLabsErrorResponse
      if (parsed.detail?.message) detail = parsed.detail.message
    } catch {
      if (errorBody.length > 0 && errorBody.length < 200) detail = errorBody
    }

    throw new Error(`ElevenLabs API error: ${detail}`)
  }
}

/**
 * Creates an ElevenLabs speech provider instance.
 *
 * @param config - ElevenLabs-specific configuration (API key, voice, model, base URL).
 * @returns An `AISpeechProvider` backed by the ElevenLabs Text-to-Speech API.
 */
export function createProvider(config?: ElevenlabsConfig): AISpeechProvider {
  return new ElevenlabsSpeechProvider(config)
}
