/**
 * Audio8-ASR-Infinite implementation of AISpeechProvider.
 *
 * Talks to a self-hosted Audio8-ASR-Infinite deployment (Docker Compose +
 * vLLM) over its realtime WebSocket (`/v1/realtime`): the client sends
 * `session.update`, an opening `input_audio_buffer.commit`, base64 PCM16
 * `input_audio_buffer.append` blocks and a closing commit with `final: true`;
 * the server answers `transcription.delta` increments and one
 * `transcription.done` with the full text.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type {
  AISpeechProvider,
  TranscribeParams,
  TranscribeResult,
  TranscribeStreamParams,
  TranscriptionStreamEvent,
} from '@molecule/api-ai-speech'

import { TARGET_SAMPLE_RATE, toBase64, toTargetBlocks, wavToTargetPcm } from './pcm.js'
import { AsyncQueue, openGlobalWebSocket, parseFrame, type RealtimeSocket } from './socket.js'
import type { Audio8Language, Audio8SpeechConfig } from './types.js'

/** Default realtime URL — the port the Audio8 Docker Compose file publishes. */
export const DEFAULT_AUDIO8_REALTIME_URL = 'ws://127.0.0.1:18191/v1/realtime'

/** Default transcription delay in ms (the model card's benchmark setting). */
export const DEFAULT_TARGET_DELAY_MS = 480

/** Model name the reference client sends in `session.update`. */
export const DEFAULT_AUDIO8_MODEL = 'audio8-asr-infinite'

/** Default wait for `transcription.done` after the audio ends. */
export const DEFAULT_FINAL_TIMEOUT_MS = 30_000

/** Audio clocks the server can run at, in ms; the delay must be a multiple of one. */
const AUDIO_CLOCKS_MS = [80, 120, 160]

/**
 * Error thrown when an Audio8 stream fails during a buffer `transcribe`.
 * `status` is the WebSocket close code (0 when the failure was not a close);
 * `code` is the server's error code when it sent one. Deliberately NOT tagged
 * with `statusCode`/`errorKey`, so API middleware answers its generic 500.
 */
export class Audio8SpeechError extends Error {
  /** WebSocket close code, or 0. */
  readonly status: number
  /** Server error code, when present. */
  readonly code: string | undefined

  /**
   * Create the error.
   *
   * @param message - Human-readable message.
   * @param status - WebSocket close code, or 0.
   * @param code - Server error code, when present.
   */
  constructor(message: string, status = 0, code?: string) {
    super(message)
    this.name = 'Audio8SpeechError'
    this.status = status
    this.code = code
  }
}

/**
 * Maps a language code to one Audio8 accepts.
 *
 * @param language - An ISO 639-1 code or BCP-47 tag (`zh`, `zh-CN`, `en-US`).
 * @param fallback - Language to use when none is given.
 * @returns `'zh'` or `'en'`.
 * @throws {Error} For any other language — Audio8 transcribes Chinese and English only.
 */
export function toAudio8Language(
  language: string | undefined,
  fallback: Audio8Language,
): Audio8Language {
  if (language === undefined || language === '') return fallback
  const primary = language.toLowerCase().split(/[-_]/)[0]
  if (primary === 'zh' || primary === 'en') return primary
  throw new Error(
    `Audio8-ASR-Infinite supports Chinese (zh) and English (en) only, got '${language}'`,
  )
}

/**
 * Validates the transcription delay.
 *
 * @param delayMs - Delay in ms.
 * @returns The delay.
 * @throws {Error} Outside 240–560 or not a multiple of 80, 120 or 160.
 */
export function assertTargetDelay(delayMs: number): number {
  if (
    !Number.isInteger(delayMs) ||
    delayMs < 240 ||
    delayMs > 560 ||
    !AUDIO_CLOCKS_MS.some((clock) => delayMs % clock === 0)
  ) {
    throw new Error(
      `Audio8 target delay must be 240–560 ms and a multiple of the audio clock (80/120/160), got ${delayMs}`,
    )
  }
  return delayMs
}

/**
 * Audio8-ASR-Infinite speech provider: low-latency streaming speech-to-text
 * for Chinese and English, plus a buffer `transcribe` built on the stream.
 */
class Audio8SpeechProvider implements AISpeechProvider {
  readonly name = 'audio8'
  readonly streamingAppendOnly = false

  /**
   * Creates a new Audio8 speech provider.
   *
   * @param config - Optional overrides; every field falls back to its env var per call.
   */
  constructor(private readonly config: Audio8SpeechConfig = {}) {}

  /**
   * Transcribe a WAV file by streaming it and awaiting `transcription.done`.
   *
   * @param params - Transcription parameters. `audio` must be 16-bit PCM WAV.
   * @returns The full transcript.
   */
  async transcribe(params: TranscribeParams): Promise<TranscribeResult> {
    const pcm = wavToTargetPcm(
      new Uint8Array(params.audio.buffer, params.audio.byteOffset, params.audio.byteLength),
    )
    const language = toAudio8Language(params.language, this.config.defaultLanguage ?? 'en')
    let text = ''
    for await (const event of this.transcribeStream(single(pcm), {
      language,
      ...(params.model !== undefined ? { model: params.model } : {}),
    })) {
      if (event.type === 'final') text = event.text
      else if (event.type === 'error') throw new Audio8SpeechError(event.message)
    }
    return { text, language }
  }

  /**
   * Transcribe live PCM16 audio over the realtime WebSocket.
   *
   * @param audio - Raw PCM16 LE mono chunks at `params.sampleRate` Hz (resampled to 16 kHz here).
   * @param params - Streaming parameters. `language` must be Chinese or English.
   * @yields {TranscriptionStreamEvent} `partial` increments, then one `final` with the full text; `error` ends the stream.
   */
  async *transcribeStream(
    audio: AsyncIterable<Uint8Array>,
    params: TranscribeStreamParams = {},
  ): AsyncGenerator<TranscriptionStreamEvent> {
    const language = toAudio8Language(params.language, this.config.defaultLanguage ?? 'en')
    const targetDelayMs = assertTargetDelay(this.resolveTargetDelay())
    const sampleRate = params.sampleRate ?? TARGET_SAMPLE_RATE
    const chunkMs = this.config.chunkMs ?? 100
    const blockBytes = Math.max(2, Math.floor((TARGET_SAMPLE_RATE * chunkMs) / 1000) * 2)
    const url =
      this.config.realtimeUrl || process.env.AUDIO8_REALTIME_URL || DEFAULT_AUDIO8_REALTIME_URL
    const finalTimeoutMs = this.config.finalTimeoutMs ?? DEFAULT_FINAL_TIMEOUT_MS
    const model = params.model ?? this.config.model ?? DEFAULT_AUDIO8_MODEL

    const queue = new AsyncQueue<TranscriptionStreamEvent>()
    let stopped = false
    let finalTimer: ReturnType<typeof setTimeout> | undefined

    const fail = (message: string): void => {
      if (queue.isEnded) return
      queue.push({ type: 'error', message })
      queue.end()
    }

    let resolveOpen!: () => void
    let rejectOpen!: (error: Error) => void
    const opened = new Promise<void>((resolve, reject) => {
      resolveOpen = resolve
      rejectOpen = reject
    })
    // Opening may fail before the pump awaits it; the pump reports it.
    opened.catch((_error: unknown) => undefined)

    const socket: RealtimeSocket = (this.config.socketFactory ?? openGlobalWebSocket)(
      url,
      {},
      {
        onOpen: () => resolveOpen(),
        onMessage: (data) => {
          const event = parseFrame(data)
          if (!event) return
          if (event.type === 'transcription.delta') {
            if (typeof event.delta === 'string' && event.delta !== '') {
              queue.push({ type: 'partial', text: event.delta })
            }
          } else if (event.type === 'transcription.done') {
            clearTimeout(finalTimer)
            queue.push({ type: 'final', text: typeof event.text === 'string' ? event.text : '' })
            queue.end()
            socket.close(1000)
          } else if (event.type === 'error') {
            const nested = event.error as { message?: unknown } | undefined
            const message =
              typeof event.message === 'string'
                ? event.message
                : typeof nested?.message === 'string'
                  ? nested.message
                  : JSON.stringify(event)
            fail(`Audio8 realtime error: ${message}`)
            socket.close(1000)
          }
        },
        onClose: (code, reason) => {
          clearTimeout(finalTimer)
          rejectOpen(new Error(`connection closed (${code})`))
          if (!queue.isEnded && !stopped) {
            fail(
              `Audio8 realtime connection closed before transcription.done (${code}${
                reason ? `: ${reason}` : ''
              })`,
            )
          }
          queue.end()
        },
        onError: (message) => {
          clearTimeout(finalTimer)
          rejectOpen(new Error(message))
          fail(`Audio8 realtime connection failed: ${message}`)
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
      await opened
      // The reference client sends these without waiting for any server event.
      socket.send(
        JSON.stringify({
          type: 'session.update',
          model,
          language,
          target_delay_ms: targetDelayMs,
        }),
      )
      socket.send(JSON.stringify({ type: 'input_audio_buffer.commit', final: false }))
      for await (const block of toTargetBlocks(audio, sampleRate, blockBytes)) {
        if (stopped || queue.isEnded) return
        socket.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: toBase64(block) }))
      }
      if (stopped || queue.isEnded) return
      socket.send(JSON.stringify({ type: 'input_audio_buffer.commit', final: true }))
      finalTimer = setTimeout(() => {
        fail(`Audio8 sent no transcription.done within ${finalTimeoutMs} ms`)
        socket.close(1000)
      }, finalTimeoutMs)
    }
    pump().catch((error: unknown) => {
      fail(`Audio8 stream failed: ${error instanceof Error ? error.message : String(error)}`)
      socket.close(1000)
    })

    try {
      yield* queue
    } finally {
      stopped = true
      clearTimeout(finalTimer)
      params.signal?.removeEventListener('abort', onAbort)
      socket.close(1000)
    }
  }

  /**
   * Reads the transcription delay for this call.
   *
   * @returns Delay in ms (config, then `AUDIO8_TARGET_DELAY_MS`, then 480).
   */
  private resolveTargetDelay(): number {
    if (this.config.targetDelayMs !== undefined) return this.config.targetDelayMs
    const raw = process.env.AUDIO8_TARGET_DELAY_MS
    return raw ? Number(raw) : DEFAULT_TARGET_DELAY_MS
  }
}

/**
 * Wraps one buffer as an async iterable.
 *
 * @param bytes - The buffer.
 * @yields {Uint8Array} The buffer once.
 */
async function* single(bytes: Uint8Array): AsyncGenerator<Uint8Array> {
  yield bytes
}

/**
 * Creates an Audio8-ASR-Infinite speech provider instance.
 *
 * @param config - Optional overrides (URL, delay, language, socket factory).
 * @returns An `AISpeechProvider` backed by a self-hosted Audio8 deployment.
 */
export function createProvider(config?: Audio8SpeechConfig): AISpeechProvider {
  return new Audio8SpeechProvider(config)
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
