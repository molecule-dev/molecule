/**
 * NeMo-Speech.cpp implementation of AISpeechProvider.
 *
 * Talks to a self-hosted `nemo-speech serve` instance: `POST
 * /v1/audio/transcriptions` (multipart, OpenAI-compatible subset, optional
 * speaker labels), `POST /v1/audio/diarizations` (who spoke when) and the
 * `/v1/audio/transcriptions/realtime` WebSocket for streaming.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type {
  AISpeechProvider,
  DiarizationSegment,
  DiarizeParams,
  DiarizeResult,
  TranscribeParams,
  TranscribeResult,
  TranscribeStreamParams,
  TranscriptionStreamEvent,
  TranscriptionWord,
} from '@molecule/api-ai-speech'

import { TARGET_SAMPLE_RATE, toTargetBlocks, toTargetWav } from './pcm.js'
import {
  AsyncQueue,
  openGlobalWebSocket,
  parseFrame,
  type RealtimeSocket,
  toWebSocketUrl,
} from './socket.js'
import { MAX_DIARIZATION_SPEAKERS, segmentsFromWords, speakerLabel } from './speakers.js'
import type { NemoSpeechConfig } from './types.js'

/** Default server URL — `nemo-speech serve`'s own default bind address. */
export const DEFAULT_NEMO_SPEECH_URL = 'http://127.0.0.1:8080'

/** Default per-request HTTP timeout. */
export const DEFAULT_TIMEOUT_MS = 300_000

/** Default wait for the final `completed` event after the audio ends. */
export const DEFAULT_FINAL_TIMEOUT_MS = 30_000

/** Streaming block size: 100 ms of 16 kHz PCM16. */
const STREAM_BLOCK_BYTES = (TARGET_SAMPLE_RATE / 10) * 2

/** Realtime event: a partial transcription result. */
const EVENT_DELTA = 'conversation.item.input_audio_transcription.delta'

/** Realtime event: a final transcription result. */
const EVENT_COMPLETED = 'conversation.item.input_audio_transcription.completed'

/**
 * Error thrown when the NeMo-Speech.cpp server refuses or fails a request.
 * Carries the HTTP `status` (0 when the server could not be reached or timed
 * out) and the server's error `type` as `code`. Deliberately NOT tagged with
 * `statusCode`/`errorKey`, so API middleware answers its generic 500 instead
 * of echoing the upstream status to the caller.
 */
export class NemoSpeechError extends Error {
  /** HTTP status from the server; 0 for a network failure or timeout. */
  readonly status: number
  /** The server's error `type` (`invalid_request_error` / `server_error`), when sent. */
  readonly code: string | undefined

  /**
   * Create the error.
   *
   * @param message - Human-readable message.
   * @param status - HTTP status (0 for network failure/timeout).
   * @param code - Server error type, when it sent one.
   * @param cause - The underlying error, if any.
   */
  constructor(message: string, status: number, code?: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'NemoSpeechError'
    this.status = status
    this.code = code
  }
}

/** Shape of a verbose_json transcription response. */
interface NemoTranscriptionResponse {
  text?: string
  words?: Array<{
    word?: string
    start?: number
    end?: number
    confidence?: number
    speaker?: unknown
  }>
}

/** Shape of a diarization response. */
interface NemoDiarizationResponse {
  segments?: Array<{ start?: number; end?: number; speaker?: unknown }>
}

/** Resolved per-call configuration. */
interface ResolvedConfig {
  baseUrl: string
  apiKey: string | undefined
  timeoutMs: number
}

/**
 * Normalizes a base URL: strips trailing slashes and a trailing `/v1`.
 *
 * @param raw - The configured base URL.
 * @returns The base URL without trailing slashes or `/v1`.
 */
function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '').replace(/\/v1$/, '')
}

/**
 * Converts raw server words to core words with normalized speaker labels.
 *
 * @param words - Words from the server.
 * @returns Core words.
 */
function mapWords(words: unknown): TranscriptionWord[] {
  if (!Array.isArray(words)) return []
  return words.map((raw: Record<string, unknown>): TranscriptionWord => {
    const speaker = speakerLabel(raw.speaker)
    return {
      word: typeof raw.word === 'string' ? raw.word : '',
      start: typeof raw.start === 'number' ? raw.start : 0,
      end: typeof raw.end === 'number' ? raw.end : 0,
      ...(speaker !== undefined ? { speaker } : {}),
    }
  })
}

/**
 * Checks `maxSpeakers` against the diarizer's hard limit.
 *
 * @param maxSpeakers - Requested bound.
 * @throws {Error} When it exceeds 8 or is not a positive integer.
 */
function assertMaxSpeakers(maxSpeakers: number | undefined): void {
  if (maxSpeakers === undefined) return
  if (!Number.isInteger(maxSpeakers) || maxSpeakers < 1) {
    throw new Error(`maxSpeakers must be a positive integer, got ${maxSpeakers}`)
  }
  if (maxSpeakers > MAX_DIARIZATION_SPEAKERS) {
    throw new Error(
      `maxSpeakers ${maxSpeakers} exceeds the diarizer's limit of ${MAX_DIARIZATION_SPEAKERS} speakers`,
    )
  }
}

/**
 * NeMo-Speech.cpp speech provider: batch and streaming speech-to-text plus
 * speaker diarization against a self-hosted `nemo-speech serve` instance.
 */
class NemoSpeechProvider implements AISpeechProvider {
  readonly name = 'nemo-speech'
  readonly streamingAppendOnly = false

  /**
   * Creates a new NeMo-Speech.cpp speech provider.
   *
   * @param config - Optional overrides; every field falls back to its env var per call.
   */
  constructor(private readonly config: NemoSpeechConfig = {}) {}

  /**
   * Transcribe a WAV file, optionally with speaker labels.
   *
   * @param params - Transcription parameters. `audio` must be 16-bit PCM WAV.
   * @returns Text, words (with `speaker` when diarized) and speaker segments.
   */
  async transcribe(params: TranscribeParams): Promise<TranscribeResult> {
    const responseFormat = params.responseFormat ?? 'verbose_json'
    if (params.diarize && responseFormat !== 'verbose_json') {
      throw new Error(
        `diarize requires responseFormat 'verbose_json' (got '${responseFormat}') — the server only returns speakers there`,
      )
    }
    assertMaxSpeakers(params.maxSpeakers)
    const cfg = this.resolveConfig()

    const form = new FormData()
    form.append('file', this.wavBlob(params.audio), 'audio.wav')
    const model = params.model ?? this.config.defaultModel
    if (model !== undefined) form.append('model', model)
    form.append('response_format', responseFormat)
    if (params.language !== undefined) form.append('language', params.language)
    if (params.diarize) form.append('diarization', 'true')

    const response = await this.request(cfg, '/v1/audio/transcriptions', form)

    if (responseFormat === 'text' || responseFormat === 'srt' || responseFormat === 'vtt') {
      return { text: await response.text() }
    }
    const data = (await response.json()) as NemoTranscriptionResponse
    const result: TranscribeResult = { text: data.text ?? '' }
    if (data.words) {
      result.words = mapWords(data.words)
      const segments = segmentsFromWords(result.words)
      if (segments) result.segments = segments
    }
    return result
  }

  /**
   * Label who spoke when, without transcribing.
   *
   * @param params - Diarization parameters. `audio` must be 16-bit PCM WAV.
   * @returns Speaker spans in time order with `speaker_<n>` labels.
   */
  async diarize(params: DiarizeParams): Promise<DiarizeResult> {
    assertMaxSpeakers(params.maxSpeakers)
    const cfg = this.resolveConfig()
    const form = new FormData()
    form.append('file', this.wavBlob(params.audio), 'audio.wav')
    const response = await this.request(cfg, '/v1/audio/diarizations', form)
    const data = (await response.json()) as NemoDiarizationResponse
    const segments = (data.segments ?? [])
      .map((seg): DiarizationSegment => ({
        start: typeof seg.start === 'number' ? seg.start : 0,
        end: typeof seg.end === 'number' ? seg.end : 0,
        speaker: speakerLabel(seg.speaker) ?? 'speaker_unknown',
      }))
      .sort((a, b) => a.start - b.start)
    return { segments }
  }

  /**
   * Transcribe live PCM16 audio over the realtime WebSocket.
   *
   * @param audio - Raw PCM16 LE mono chunks at `params.sampleRate` Hz (resampled to 16 kHz here).
   * @param params - Streaming parameters.
   * @yields {TranscriptionStreamEvent} `partial` increments, then a `final` per completed item; `error` ends the stream.
   */
  async *transcribeStream(
    audio: AsyncIterable<Uint8Array>,
    params: TranscribeStreamParams = {},
  ): AsyncGenerator<TranscriptionStreamEvent> {
    const sampleRate = params.sampleRate ?? TARGET_SAMPLE_RATE
    const cfg = this.resolveConfig()
    const url = `${toWebSocketUrl(cfg.baseUrl)}/v1/audio/transcriptions/realtime`
    const headers: Record<string, string> = cfg.apiKey
      ? { Authorization: `Bearer ${cfg.apiKey}` }
      : {}
    const finalTimeoutMs = this.config.finalTimeoutMs ?? DEFAULT_FINAL_TIMEOUT_MS
    const queue = new AsyncQueue<TranscriptionStreamEvent>()
    let stopped = false
    let committed = false
    let finalTimer: ReturnType<typeof setTimeout> | undefined
    let readyTimer: ReturnType<typeof setTimeout> | undefined

    const fail = (message: string): void => {
      if (queue.isEnded) return
      queue.push({ type: 'error', message })
      queue.end()
    }

    let resolveReady!: () => void
    let rejectReady!: (error: Error) => void
    const ready = new Promise<void>((resolve, reject) => {
      resolveReady = resolve
      rejectReady = reject
    })
    // Readiness may reject before the pump awaits it; the pump reports it.
    ready.catch((_error: unknown) => undefined)

    const socket: RealtimeSocket = (this.config.socketFactory ?? openGlobalWebSocket)(
      url,
      headers,
      {
        onOpen: () => {
          // The server greets every connection with session.created; without it
          // the audio would be sent into a session that never started.
          readyTimer = setTimeout(() => {
            rejectReady(new Error(`no session.created within ${finalTimeoutMs} ms`))
          }, finalTimeoutMs)
        },
        onMessage: (data) => {
          const event = parseFrame(data)
          if (!event) return
          const type = event.type
          if (type === 'session.created') {
            if (this.config.sessionUpdate) {
              socket.send(JSON.stringify({ ...this.config.sessionUpdate, type: 'session.update' }))
            }
            clearTimeout(readyTimer)
            resolveReady()
          } else if (type === EVENT_DELTA) {
            const text = typeof event.delta === 'string' ? event.delta : event.text
            if (typeof text === 'string' && text !== '') queue.push({ type: 'partial', text })
          } else if (type === EVENT_COMPLETED) {
            const text =
              typeof event.transcript === 'string'
                ? event.transcript
                : typeof event.text === 'string'
                  ? event.text
                  : ''
            const words = mapWords(event.words)
            queue.push({ type: 'final', text, ...(words.length > 0 ? { words } : {}) })
            if (committed) {
              clearTimeout(finalTimer)
              queue.end()
              socket.close(1000)
            }
          } else if (type === 'error' || event.error !== undefined) {
            const error = event.error as { message?: unknown } | undefined
            fail(
              `NeMo-Speech realtime error: ${
                typeof error?.message === 'string' ? error.message : JSON.stringify(event)
              }`,
            )
            socket.close(1000)
          }
        },
        onClose: (code, reason) => {
          clearTimeout(finalTimer)
          clearTimeout(readyTimer)
          rejectReady(new Error(`connection closed (${code})`))
          if (!queue.isEnded && !stopped && code !== 1000) {
            fail(`NeMo-Speech realtime connection closed (${code}${reason ? `: ${reason}` : ''})`)
          }
          queue.end()
        },
        onError: (message) => {
          clearTimeout(finalTimer)
          clearTimeout(readyTimer)
          rejectReady(new Error(message))
          fail(`NeMo-Speech realtime connection failed: ${message}`)
        },
      },
    )

    const onAbort = (): void => {
      stopped = true
      clearTimeout(finalTimer)
      queue.end()
      socket.close(1000)
    }
    params.signal?.addEventListener('abort', onAbort, { once: true })

    const pump = async (): Promise<void> => {
      await ready
      for await (const block of toTargetBlocks(audio, sampleRate, STREAM_BLOCK_BYTES)) {
        if (stopped || queue.isEnded) return
        socket.send(block)
      }
      if (stopped || queue.isEnded) return
      committed = true
      socket.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
      finalTimer = setTimeout(() => {
        fail(`NeMo-Speech sent no completed transcription within ${finalTimeoutMs} ms`)
        socket.close(1000)
      }, finalTimeoutMs)
    }
    pump().catch((error: unknown) => {
      fail(`NeMo-Speech stream failed: ${error instanceof Error ? error.message : String(error)}`)
      socket.close(1000)
    })

    try {
      yield* queue
    } finally {
      stopped = true
      clearTimeout(finalTimer)
      clearTimeout(readyTimer)
      params.signal?.removeEventListener('abort', onAbort)
      socket.close(1000)
    }
  }

  /**
   * Wraps audio bytes as a 16 kHz mono WAV blob.
   *
   * @param audio - Source 16-bit PCM WAV bytes.
   * @returns A WAV blob.
   */
  private wavBlob(audio: Uint8Array | Buffer): Blob {
    const wav = toTargetWav(new Uint8Array(audio.buffer, audio.byteOffset, audio.byteLength))
    return new Blob([wav as BlobPart], { type: 'audio/wav' })
  }

  /**
   * Reads configuration for this call (env vars are read here, never at import).
   *
   * @returns The resolved configuration.
   */
  private resolveConfig(): ResolvedConfig {
    const apiKey = this.config.apiKey ?? process.env.NEMO_SPEECH_API_KEY
    return {
      baseUrl: normalizeBaseUrl(
        this.config.baseUrl || process.env.NEMO_SPEECH_URL || DEFAULT_NEMO_SPEECH_URL,
      ),
      apiKey: apiKey ? apiKey : undefined,
      timeoutMs: this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    }
  }

  /**
   * POSTs a multipart form and maps failures to {@link NemoSpeechError}.
   *
   * @param cfg - Resolved configuration.
   * @param path - Route path (starting with `/v1`).
   * @param body - The multipart form.
   * @returns The successful response.
   * @throws {NemoSpeechError} On a network failure, timeout or non-2xx status.
   */
  private async request(cfg: ResolvedConfig, path: string, body: FormData): Promise<Response> {
    let response: Response
    try {
      response = await fetch(`${cfg.baseUrl}${path}`, {
        method: 'POST',
        headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {},
        body,
        signal: AbortSignal.timeout(cfg.timeoutMs),
      })
    } catch (error) {
      throw new NemoSpeechError(
        `NeMo-Speech server unreachable at ${cfg.baseUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        0,
        undefined,
        error,
      )
    }
    if (!response.ok) {
      const raw = await response.text().catch((error: unknown) => {
        // The status line is still reported below; the body is only detail.
        return `(error body unreadable: ${error instanceof Error ? error.message : String(error)})`
      })
      let message = `HTTP ${response.status}`
      let code: string | undefined
      try {
        const parsed = JSON.parse(raw) as { error?: { message?: string; type?: string } }
        if (parsed.error?.message) message = parsed.error.message
        code = parsed.error?.type
      } catch (_error) {
        // Not JSON — fall back to the raw text when it is short enough to be a message.
        if (raw.length > 0 && raw.length < 200) message = raw
      }
      throw new NemoSpeechError(`NeMo-Speech error: ${message}`, response.status, code)
    }
    return response
  }
}

/**
 * Creates a NeMo-Speech.cpp speech provider instance.
 *
 * @param config - Optional overrides (URL, API key, timeouts, socket factory).
 * @returns An `AISpeechProvider` backed by a self-hosted `nemo-speech serve`.
 */
export function createProvider(config?: NemoSpeechConfig): AISpeechProvider {
  return new NemoSpeechProvider(config)
}

/** Lazily-initialized provider singleton. Defers creation until first use so that env vars / secrets are resolved. */
let _provider: AISpeechProvider | null = null
/**
 * The provider implementation.
 */
export const provider: AISpeechProvider = new Proxy({} as AISpeechProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
