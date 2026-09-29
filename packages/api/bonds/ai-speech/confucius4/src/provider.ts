/**
 * Confucius4-R2T2 implementation of AISpeechProvider.
 *
 * Talks to a self-hosted Confucius4-R2T2 `ws_server.py`
 * (`/asr_stream_api_v1`): a JSON header message, raw 16 kHz int16 PCM binary
 * frames, then the `YOUDAO_ONETIME_ASR_STREAM_EOS` text frame. The server
 * answers append-only text increments; `reset: true` marks a segment boundary
 * and the stream ends when the server closes the socket. There is no final
 * flag on the wire.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import { randomUUID } from 'node:crypto'

import './secrets.js'

import type {
  AISpeechProvider,
  TranscribeParams,
  TranscribeResult,
  TranscribeStreamParams,
  TranscriptionStreamEvent,
} from '@molecule/api-ai-speech'

import { TARGET_SAMPLE_RATE, toTargetBlocks, wavToTargetPcm } from './pcm.js'
import { AsyncQueue, openGlobalWebSocket, parseFrame, type RealtimeSocket } from './socket.js'
import type { Confucius4SpeechConfig } from './types.js'

/** Default WebSocket URL of `ws_server.py`. */
export const DEFAULT_CONFUCIUS4_WS_URL = 'ws://127.0.0.1:8272/asr_stream_api_v1'

/** The server's hardcoded secret-key whitelist entry. */
export const DEFAULT_CONFUCIUS4_SECRET_KEY = 'test0102'

/** End-of-audio text frame. */
export const CONFUCIUS4_EOS = 'YOUDAO_ONETIME_ASR_STREAM_EOS'

/** Longest `system_prompt` the server accepts. */
export const MAX_SYSTEM_PROMPT_CHARS = 4000

/** Close code the server uses for a rejected secret key. */
export const CLOSE_BAD_SECRET_KEY = 4401

/** Default wait for the server to close after end-of-stream. */
export const DEFAULT_FINAL_TIMEOUT_MS = 30_000

/** 160 ms of 16 kHz PCM16 — the reference client's block size. */
const BLOCK_BYTES = (TARGET_SAMPLE_RATE * 160 * 2) / 1000

/**
 * Error thrown when a Confucius4 stream fails during a buffer `transcribe`.
 * `status` is the WebSocket close code (4401 = secret key rejected; 0 when the
 * failure was not a close). Deliberately NOT tagged with `statusCode`/
 * `errorKey`, so API middleware answers its generic 500.
 */
export class Confucius4SpeechError extends Error {
  /** WebSocket close code, or 0. */
  readonly status: number

  /**
   * Create the error.
   *
   * @param message - Human-readable message.
   * @param status - WebSocket close code, or 0.
   */
  constructor(message: string, status = 0) {
    super(message)
    this.name = 'Confucius4SpeechError'
    this.status = status
  }
}

/** Server response message. */
interface Confucius4Message {
  status?: string
  requestId?: string
  msg?: { text?: unknown; reset?: unknown } | string
}

/**
 * Confucius4-R2T2 speech provider: append-only streaming speech-to-text plus
 * a buffer `transcribe` built on the stream.
 */
class Confucius4SpeechProvider implements AISpeechProvider {
  readonly name = 'confucius4'
  readonly streamingAppendOnly = true

  /**
   * Creates a new Confucius4 speech provider.
   *
   * @param config - Optional overrides; every field falls back to its env var per call.
   */
  constructor(private readonly config: Confucius4SpeechConfig = {}) {}

  /**
   * Transcribe a WAV file by streaming it until the server closes.
   *
   * @param params - Transcription parameters. `audio` must be 16-bit PCM WAV.
   * @returns The full transcript (all segments joined).
   */
  async transcribe(params: TranscribeParams): Promise<TranscribeResult> {
    const pcm = wavToTargetPcm(
      new Uint8Array(params.audio.buffer, params.audio.byteOffset, params.audio.byteLength),
    )
    let text = ''
    let closeCode = 0
    for await (const event of this.stream(
      single(pcm),
      {
        ...(params.language !== undefined ? { language: params.language } : {}),
        ...(params.prompt !== undefined ? { prompt: params.prompt } : {}),
      },
      (code) => {
        closeCode = code
      },
    )) {
      if (event.type === 'final') text += event.text
      else if (event.type === 'error') throw new Confucius4SpeechError(event.message, closeCode)
    }
    return { text }
  }

  /**
   * Transcribe live PCM16 audio over the WebSocket.
   *
   * @param audio - Raw PCM16 LE mono chunks at `params.sampleRate` Hz (resampled to 16 kHz here).
   * @param params - Streaming parameters (`prompt` becomes `system_prompt`).
   * @returns Append-only `delta` events; a `final` + `turn-end` per server reset and a
   *   `final` at the end; `error` ends the stream.
   */
  transcribeStream(
    audio: AsyncIterable<Uint8Array>,
    params: TranscribeStreamParams = {},
  ): AsyncGenerator<TranscriptionStreamEvent> {
    return this.stream(audio, params)
  }

  /**
   * Runs one streaming session.
   *
   * @param audio - Raw PCM16 LE mono chunks.
   * @param params - Streaming parameters.
   * @param onCloseCode - Receives the socket's close code.
   * @yields {TranscriptionStreamEvent} Transcription events.
   */
  private async *stream(
    audio: AsyncIterable<Uint8Array>,
    params: TranscribeStreamParams,
    onCloseCode?: (code: number) => void,
  ): AsyncGenerator<TranscriptionStreamEvent> {
    const systemPrompt =
      params.prompt ?? this.config.systemPrompt ?? process.env.CONFUCIUS4_SYSTEM_PROMPT
    if (systemPrompt !== undefined && systemPrompt.length > MAX_SYSTEM_PROMPT_CHARS) {
      throw new Error(
        `Confucius4 system_prompt is ${systemPrompt.length} characters; the server accepts at most ${MAX_SYSTEM_PROMPT_CHARS}`,
      )
    }
    const sampleRate = params.sampleRate ?? TARGET_SAMPLE_RATE
    const url = this.config.wsUrl || process.env.CONFUCIUS4_WS_URL || DEFAULT_CONFUCIUS4_WS_URL
    const secretKey =
      this.config.secretKey || process.env.CONFUCIUS4_SECRET_KEY || DEFAULT_CONFUCIUS4_SECRET_KEY
    const finalTimeoutMs = this.config.finalTimeoutMs ?? DEFAULT_FINAL_TIMEOUT_MS
    const header: Record<string, unknown> = {
      channels: 1,
      sample_rate: TARGET_SAMPLE_RATE,
      requestId: randomUUID(),
      language: params.language ?? this.config.defaultLanguage ?? 'zhen',
      use_vad: this.config.useVad ?? false,
      secret_key: secretKey,
      mode: this.config.mode ?? 'slow',
    }
    if (this.config.smooth !== undefined) header.smooth = this.config.smooth
    if (systemPrompt) header.system_prompt = systemPrompt

    const queue = new AsyncQueue<TranscriptionStreamEvent>()
    let stopped = false
    let segment = ''
    let finalTimer: ReturnType<typeof setTimeout> | undefined

    const fail = (message: string): void => {
      if (queue.isEnded) return
      queue.push({ type: 'error', message })
      queue.end()
    }
    const settleSegment = (): void => {
      if (segment === '') return
      queue.push({ type: 'final', text: segment })
      segment = ''
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
          const message = parseFrame(data) as Confucius4Message | null
          if (!message) return
          if (message.status === 'error') {
            const detail =
              typeof message.msg === 'string'
                ? message.msg
                : typeof message.msg?.text === 'string' && message.msg.text !== ''
                  ? message.msg.text
                  : JSON.stringify(message.msg ?? message)
            fail(`Confucius4 error: ${detail}`)
            socket.close(1000)
            return
          }
          if (typeof message.msg !== 'object' || message.msg === null) return
          const text = message.msg.text
          if (typeof text === 'string' && text !== '') {
            segment += text
            queue.push({ type: 'delta', text })
          }
          // reset = VAD end of speech, a detected hallucination, or the 60 s / 90 s
          // reset timeout — a segment boundary, never an error.
          if (message.msg.reset === true) {
            settleSegment()
            queue.push({ type: 'turn-end' })
          }
        },
        onClose: (code, reason) => {
          clearTimeout(finalTimer)
          onCloseCode?.(code)
          rejectOpen(new Error(`connection closed (${code})`))
          if (queue.isEnded || stopped) return
          if (code === 1000) {
            settleSegment()
            queue.end()
          } else if (code === CLOSE_BAD_SECRET_KEY) {
            fail('Confucius4 rejected the secret key (close 4401) — check CONFUCIUS4_SECRET_KEY')
          } else {
            fail(`Confucius4 connection closed (${code}${reason ? `: ${reason}` : ''})`)
          }
        },
        onError: (message) => {
          clearTimeout(finalTimer)
          rejectOpen(new Error(message))
          fail(`Confucius4 connection failed: ${message}`)
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
      socket.send(JSON.stringify(header))
      for await (const block of toTargetBlocks(audio, sampleRate, BLOCK_BYTES)) {
        if (stopped || queue.isEnded) return
        socket.send(block)
      }
      if (stopped || queue.isEnded) return
      socket.send(CONFUCIUS4_EOS)
      finalTimer = setTimeout(() => {
        fail(`Confucius4 did not close the stream within ${finalTimeoutMs} ms of end-of-stream`)
        socket.close(1000)
      }, finalTimeoutMs)
    }
    pump().catch((error: unknown) => {
      fail(`Confucius4 stream failed: ${error instanceof Error ? error.message : String(error)}`)
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
 * Creates a Confucius4-R2T2 speech provider instance.
 *
 * @param config - Optional overrides (URL, secret key, prompt, header options, socket factory).
 * @returns An `AISpeechProvider` backed by a self-hosted Confucius4 server.
 */
export function createProvider(config?: Confucius4SpeechConfig): AISpeechProvider {
  return new Confucius4SpeechProvider(config)
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
