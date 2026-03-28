/**
 * OpenAI implementation of AISpeechProvider.
 *
 * Uses OpenAI TTS API for text-to-speech synthesis and
 * Whisper API for speech-to-text transcription and translation.
 *
 * @module
 */

import type {
  AISpeechProvider,
  SynthesizeParams,
  SynthesizeResult,
  TranscribeParams,
  TranscribeResult,
  TranscriptionSegment,
  TranscriptionWord,
  TranslateParams,
  TranslateResult,
} from '@molecule/api-ai-speech'

import type { OpenaiSpeechConfig } from './types.js'

/** MIME types for each supported TTS audio format. */
const FORMAT_CONTENT_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg',
  opus: 'audio/opus',
  aac: 'audio/aac',
  flac: 'audio/flac',
  wav: 'audio/wav',
  pcm: 'audio/pcm',
}

/** Shape of an OpenAI API error response. */
interface OpenAIErrorResponse {
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

/** Shape of the OpenAI transcription/translation JSON response. */
interface OpenAITranscriptionResponse {
  text: string
  language?: string
  duration?: number
  segments?: Array<{
    id: number
    start: number
    end: number
    text: string
  }>
  words?: Array<{
    word: string
    start: number
    end: number
  }>
}

/** Maximum number of retry attempts for retryable errors. */
const MAX_RETRIES = 3

/** HTTP status codes that trigger automatic retry. */
const RETRYABLE_STATUSES = new Set([429, 503, 529])

/**
 * OpenAI speech provider implementing text-to-speech (TTS) via the
 * OpenAI TTS API and speech-to-text (STT) via the Whisper API.
 */
class OpenaiSpeechProvider implements AISpeechProvider {
  readonly name = 'openai'
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly defaultTTSModel: string
  private readonly defaultSTTModel: string
  private readonly defaultVoice: string
  private readonly defaultResponseFormat: string
  private readonly defaultSpeed: number

  /**
   * Creates a new OpenAI speech provider.
   *
   * @param config - Provider configuration. API key defaults to OPENAI_API_KEY env var.
   */
  constructor(config: OpenaiSpeechConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? ''
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com'
    this.defaultTTSModel = config.defaultTTSModel ?? 'tts-1'
    this.defaultSTTModel = config.defaultSTTModel ?? 'whisper-1'
    this.defaultVoice = config.defaultVoice ?? 'alloy'
    this.defaultResponseFormat = config.defaultResponseFormat ?? 'mp3'
    this.defaultSpeed = config.defaultSpeed ?? 1.0
  }

  /**
   * Convert text to speech using the OpenAI TTS API.
   *
   * Supports models: tts-1, tts-1-hd, gpt-4o-mini-tts.
   * Voices: alloy, echo, fable, onyx, nova, shimmer (and more for gpt-4o-mini-tts).
   *
   * @param params - Synthesis parameters.
   * @returns Audio data with content type.
   */
  async synthesize(params: SynthesizeParams): Promise<SynthesizeResult> {
    const model = params.model ?? this.defaultTTSModel
    const voice = params.voice ?? this.defaultVoice
    const responseFormat = params.responseFormat ?? this.defaultResponseFormat
    const speed = params.speed ?? this.defaultSpeed

    const body: Record<string, unknown> = {
      model,
      input: params.input,
      voice,
      response_format: responseFormat,
      speed,
    }

    if (params.instructions !== undefined) {
      body.instructions = params.instructions
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    const arrayBuffer = await response.arrayBuffer()
    const contentType =
      FORMAT_CONTENT_TYPES[responseFormat] ??
      response.headers.get('content-type') ??
      'application/octet-stream'

    return {
      audio: new Uint8Array(arrayBuffer),
      contentType,
    }
  }

  /**
   * Transcribe audio to text using the OpenAI Whisper API.
   *
   * Supports models: whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe.
   * Input formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm.
   *
   * @param params - Transcription parameters.
   * @returns Transcribed text with optional timestamps and metadata.
   */
  async transcribe(params: TranscribeParams): Promise<TranscribeResult> {
    const model = params.model ?? this.defaultSTTModel
    const filename = params.filename ?? 'audio.wav'
    const responseFormat = params.responseFormat ?? 'verbose_json'

    const formData = new FormData()
    const audioBytes = new Uint8Array(params.audio) as BlobPart
    formData.append('file', new Blob([audioBytes]), filename)
    formData.append('model', model)
    formData.append('response_format', responseFormat)

    if (params.language !== undefined) {
      formData.append('language', params.language)
    }
    if (params.prompt !== undefined) {
      formData.append('prompt', params.prompt)
    }
    if (params.temperature !== undefined) {
      formData.append('temperature', String(params.temperature))
    }
    if (params.timestampGranularity === 'word' || params.timestampGranularity === 'both') {
      formData.append('timestamp_granularities[]', 'word')
    }
    if (params.timestampGranularity === 'segment' || params.timestampGranularity === 'both') {
      formData.append('timestamp_granularities[]', 'segment')
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    })

    // Plain text formats return the text directly
    if (responseFormat === 'text' || responseFormat === 'srt' || responseFormat === 'vtt') {
      return { text: await response.text() }
    }

    const data = (await response.json()) as OpenAITranscriptionResponse

    const result: TranscribeResult = {
      text: data.text,
    }

    if (data.language !== undefined) result.language = data.language
    if (data.duration !== undefined) result.duration = data.duration

    if (data.segments) {
      result.segments = data.segments.map(
        (seg): TranscriptionSegment => ({
          id: seg.id,
          start: seg.start,
          end: seg.end,
          text: seg.text,
        }),
      )
    }

    if (data.words) {
      result.words = data.words.map(
        (w): TranscriptionWord => ({
          word: w.word,
          start: w.start,
          end: w.end,
        }),
      )
    }

    return result
  }

  /**
   * Translate audio from any language to English text using the OpenAI Whisper API.
   *
   * Only supports Whisper models. Always outputs English text.
   *
   * @param params - Translation parameters.
   * @returns Translated English text with optional metadata.
   */
  async translate(params: TranslateParams): Promise<TranslateResult> {
    const model = params.model ?? this.defaultSTTModel
    const filename = params.filename ?? 'audio.wav'
    const responseFormat = params.responseFormat ?? 'verbose_json'

    const formData = new FormData()
    const audioBytes = new Uint8Array(params.audio) as BlobPart
    formData.append('file', new Blob([audioBytes]), filename)
    formData.append('model', model)
    formData.append('response_format', responseFormat)

    if (params.prompt !== undefined) {
      formData.append('prompt', params.prompt)
    }
    if (params.temperature !== undefined) {
      formData.append('temperature', String(params.temperature))
    }

    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/audio/translations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    })

    // Plain text formats return the text directly
    if (responseFormat === 'text' || responseFormat === 'srt' || responseFormat === 'vtt') {
      return { text: await response.text() }
    }

    const data = (await response.json()) as OpenAITranscriptionResponse

    const result: TranslateResult = {
      text: data.text,
    }

    if (data.language !== undefined) result.language = data.language
    if (data.duration !== undefined) result.duration = data.duration

    if (data.segments) {
      result.segments = data.segments.map(
        (seg): TranscriptionSegment => ({
          id: seg.id,
          start: seg.start,
          end: seg.end,
          text: seg.text,
        }),
      )
    }

    return result
  }

  /**
   * Makes an HTTP request with automatic retry on rate-limit and server errors.
   *
   * Implements exponential backoff with optional Retry-After header support.
   *
   * @param url - Request URL.
   * @param init - Fetch request options.
   * @returns The successful Response object.
   * @throws {Error} On non-retryable API errors or after exhausting retries.
   */
  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    let response: Response | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(url, init)

      if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES) {
        const retryAfter = response.headers.get('retry-after')
        const delayMs = retryAfter
          ? Math.min(parseInt(retryAfter, 10) * 1000, 60_000)
          : Math.min(1000 * 2 ** attempt, 30_000)
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
        continue
      }

      break
    }

    if (!response!.ok) {
      let detail = `HTTP ${response!.status}`

      const errorBody = await response!.text().catch(() => '')
      try {
        const parsed = JSON.parse(errorBody) as OpenAIErrorResponse
        if (parsed.error?.message) {
          detail = parsed.error.message
        }
      } catch {
        if (errorBody.length > 0 && errorBody.length < 200) {
          detail = errorBody
        }
      }

      throw new Error(`OpenAI Speech API error: ${detail}`)
    }

    return response!
  }
}

/**
 * Creates an OpenAI speech provider instance.
 *
 * @param config - OpenAI-specific configuration (API key, models, voice, base URL).
 * @returns An `AISpeechProvider` backed by OpenAI TTS and Whisper APIs.
 */
export function createProvider(config?: OpenaiSpeechConfig): AISpeechProvider {
  return new OpenaiSpeechProvider(config)
}
