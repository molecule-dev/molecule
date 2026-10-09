/**
 * Whistle implementation of AISpeechProvider — Cactus Compute's 16.9 MB
 * speech-to-text model running IN-PROCESS under Node via the `needle`
 * WebAssembly engine. No server, no API key, no per-minute billing: the
 * engine (~1 MB `needle.wasm`) and weights (`whistle.cact`) are fetched once
 * (or read from local paths) and cached for the process's lifetime.
 *
 * Implements `transcribe` (WAV in any uncompressed PCM format, resampled to
 * the 16 kHz mono float the engine takes, word timestamps, keyword biasing
 * via `prompt`) and `transcribeStream` (append-only deltas — words two
 * consecutive passes agree on, with the unconfirmed tail as partials).
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
  TranscriptionSegment,
  TranscriptionStreamEvent,
  TranscriptionWord,
} from '@molecule/api-ai-speech'

import {
  DEFAULT_WHISTLE_ENGINE_URL,
  DEFAULT_WHISTLE_WEIGHTS_URL,
  loadWhistleEngine,
  normalizeKeywords,
  WHISTLE_MAX_CLIP_SECONDS,
  WHISTLE_SAMPLE_RATE,
} from './engine.js'
import { WHISTLE_LANGUAGES, type WhistleSpeechConfig } from './types.js'
import { decodeWavToMono16k, FloatBlockResampler } from './wav.js'

/** Samples per streaming block — the engine's recommended ~1 s append. */
const STREAM_BLOCK_SAMPLES = WHISTLE_SAMPLE_RATE

/**
 * The engine keeps its streaming state (rolling audio, the two-pass agreement)
 * inside ONE process-global wasm instance — `streamProcess` appends to it and
 * `streamStop` ends it, with no session handle — so two concurrent
 * `transcribeStream` calls would interleave their audio into that single
 * state: one caller's words would be committed into the other's transcript,
 * and the first `streamStop` would end the other's session mid-dictation.
 * Since the engine is module-global (every provider instance shares it), the
 * guard is module-global too: a stream session holds this FIFO gate from its
 * FIRST block until its stop, and a concurrent session queues behind it
 * instead of corrupting it. Taken lazily — at the first processed block, not
 * at generator start — so a caller whose transport stalls before sending
 * audio never blocks anyone.
 */
let engineStreamTail: Promise<void> = Promise.resolve()

/**
 * Waits until the engine's single stream session is free.
 *
 * @returns The session's release function — call exactly once, after this
 *   session's last engine stream call (`streamProcess` or `streamStop`) has
 *   been made.
 */
async function acquireEngineStreamSession(): Promise<() => void> {
  const wait = engineStreamTail
  let release!: () => void
  const done = new Promise<void>((resolve) => {
    release = resolve
  })
  engineStreamTail = wait.then(() => done)
  await wait
  return release
}

/**
 * Maps a BCP-47 or ISO 639-1 language to Whistle's set, or null to detect.
 * @param language - The requested language, when given.
 * @returns The base code, or null for auto-detection.
 * @throws {Error} When the language is not one of Whistle's seven.
 */
function resolveLanguage(language: string | undefined): string | null {
  if (language === undefined || language === '') return null
  const base = language.split('-')[0].toLowerCase()
  if (!(WHISTLE_LANGUAGES as readonly string[]).includes(base)) {
    throw new Error(
      `Whistle transcribes ${WHISTLE_LANGUAGES.join(', ')} — not '${language}' (use @molecule/api-ai-speech-openai for other languages)`,
    )
  }
  return base
}

/**
 * Converts little-endian PCM16 bytes to float samples in [-1, 1].
 * @param chunk - Raw PCM16 LE bytes.
 * @returns Float samples.
 */
function pcm16ToFloat(chunk: Uint8Array): Float32Array {
  const copy = new Uint8Array(chunk.byteLength)
  copy.set(chunk)
  const ints = new Int16Array(copy.buffer)
  const out = new Float32Array(ints.length)
  for (let i = 0; i < ints.length; i++) out[i] = ints[i] / 0x8000
  return out
}

/**
 * Whistle speech provider: in-process CPU transcription via the Cactus
 * needle WASM engine.
 */
class WhistleSpeechProvider implements AISpeechProvider {
  readonly name = 'whistle'
  readonly streamingAppendOnly = true

  /**
   * Creates a new Whistle speech provider.
   * @param config - Optional overrides; every field falls back to its env var per call.
   */
  constructor(private readonly config: WhistleSpeechConfig = {}) {}

  /**
   * Transcribe uncompressed WAV audio to text.
   *
   * @param params - Transcription parameters. `audio` must be uncompressed
   *   PCM WAV (8/16/24/32-bit integer or 32-bit float — anything else
   *   throws); it is mixed down to mono and resampled to 16 kHz here.
   *   `language` (ISO 639-1) is forced when given, detected otherwise;
   *   `prompt` becomes Whistle's keyword biasing list. Audio longer than 30 s
   *   is transcribed in consecutive 30 s windows (Whistle's per-pass limit)
   *   and the results joined.
   * @returns Text, language, duration, segments (one per non-empty window)
   *   and words (when `timestampGranularity` is `'word'` or `'both'`).
   */
  async transcribe(params: TranscribeParams): Promise<TranscribeResult> {
    const decoded = decodeWavToMono16k(params.audio)
    const language = resolveLanguage(params.language ?? this.config.defaultLanguage)
    const keywords = normalizeKeywords(params.prompt ?? this.config.defaultKeywords)
    const wantWords =
      params.timestampGranularity === 'word' || params.timestampGranularity === 'both'
    const engine = await this.loadEngine()

    const windowSamples = WHISTLE_MAX_CLIP_SECONDS * WHISTLE_SAMPLE_RATE
    const segments: TranscriptionSegment[] = []
    const words: TranscriptionWord[] = []
    let text = ''
    let detected: string | undefined
    let segmentId = 0

    for (let start = 0; start < decoded.samples.length; start += windowSamples) {
      const window = decoded.samples.subarray(
        start,
        Math.min(start + windowSamples, decoded.samples.length),
      )
      const result = engine.transcribe(window, { language, keywords, wordTimestamps: wantWords })
      if (!detected && result.language) detected = result.language
      const chunkText = result.text.trim()
      if (!chunkText) continue
      const offset = start / WHISTLE_SAMPLE_RATE
      const end = offset + window.length / WHISTLE_SAMPLE_RATE
      if (text !== '') text += ' '
      text += chunkText
      segments.push({ id: segmentId++, start: offset, end, text: chunkText })
      if (result.words) {
        for (const word of result.words) {
          words.push({ word: word.word, start: word.start + offset, end: word.end + offset })
        }
      }
    }

    const result: TranscribeResult = { text, duration: decoded.duration }
    if (detected !== undefined) result.language = detected
    if (segments.length > 0) result.segments = segments
    if (words.length > 0) result.words = words
    return result
  }

  /**
   * Transcribe live PCM16 audio in-process.
   *
   * The engine carries ONE stream session per process, so concurrent
   * transcriptions are SERIALIZED through it (see {@link engineStreamTail}): a
   * session holds the engine from its first processed block until its stop,
   * and a concurrent caller's session queues behind it — audio already
   * delivered to this generator waits in the resampler, and audio not yet
   * pulled waits in the caller's transport.
   *
   * @param audio - Raw PCM16 LE mono chunks at `params.sampleRate` Hz
   *   (resampled to 16 kHz here).
   * @param params - Streaming parameters. `language` forces one of the seven
   *   languages; `prompt` becomes keyword biasing.
   * @yields {TranscriptionStreamEvent} Append-only `delta` events as words
   *   are committed (two consecutive passes agreed on them), `partial` events
   *   carrying the still-unconfirmed tail, and one `final` with the full
   *   committed text when the input ends.
   */
  async *transcribeStream(
    audio: AsyncIterable<Uint8Array>,
    params: TranscribeStreamParams = {},
  ): AsyncGenerator<TranscriptionStreamEvent> {
    // Validate the caller's rate FIRST — before the engine download and before
    // the resampler's arithmetic: a 0/negative/NaN rate makes the resampler's
    // `lastNeeded` bound never advance, so its emit loop would spin forever
    // inside the first `push()` (an event-loop hang with an unbounded block
    // array, not a catchable error).
    const sourceRate = params.sampleRate ?? WHISTLE_SAMPLE_RATE
    if (!Number.isFinite(sourceRate) || sourceRate <= 0) {
      throw new Error(`Whistle streaming needs a finite, positive sampleRate (got ${sourceRate}).`)
    }
    const engine = await this.loadEngine()
    const language = resolveLanguage(params.language ?? this.config.defaultLanguage)
    const keywords = normalizeKeywords(params.prompt ?? this.config.defaultKeywords)
    const resampler = new FloatBlockResampler(sourceRate, WHISTLE_SAMPLE_RATE, STREAM_BLOCK_SAMPLES)

    // A transport can split one PCM16 sample's two bytes across chunks (a
    // frame boundary at an odd byte offset). `Int16Array` refuses an odd byte
    // count, so the trailing byte is HELD here and prepended to the next chunk
    // instead of crashing the stream. A half-sample still held at end of input
    // is one truncated PCM16 sample of silence — dropped, nothing to play.
    let heldByte: number | null = null
    const rejoin = (chunk: Uint8Array): Uint8Array => {
      if (heldByte === null) return chunk
      const joined = new Uint8Array(chunk.length + 1)
      joined[0] = heldByte
      joined.set(chunk, 1)
      heldByte = null
      return joined
    }

    let committed = ''
    let lastPending: string | null = null
    let stopped = false
    let streamEnded = false
    // This session's hold on the engine's single stream — null until the first
    // block is actually processed (a transport that stalls before sending
    // audio never takes the gate). `sessionStarted` distinguishes "holds the
    // gate and HAS written to the engine's stream" from "holds the gate but
    // was aborted before the first block": only the former may call
    // streamStop(), or the cleanup would end whichever OTHER session now owns
    // the engine's stream.
    let releaseSession: (() => void) | null = null
    let sessionStarted = false
    const onAbort = (): void => {
      stopped = true
    }
    params.signal?.addEventListener('abort', onAbort, { once: true })

    try {
      for await (const chunk of audio) {
        if (stopped) break
        let bytes = rejoin(chunk)
        if (bytes.length % 2 === 1) {
          heldByte = bytes[bytes.length - 1]!
          bytes = bytes.subarray(0, bytes.length - 1)
        }
        for (const block of resampler.push(pcm16ToFloat(bytes))) {
          if (stopped) break
          if (releaseSession === null) releaseSession = await acquireEngineStreamSession()
          // The abort may have landed while this session waited for the gate —
          // do not write to the engine's stream on behalf of a dead consumer.
          if (stopped) break
          sessionStarted = true
          const pass = engine.streamProcess(block, { language, keywords })
          const text = pass.text.trim()
          if (text !== '') {
            committed += committed === '' ? text : ` ${text}`
            yield { type: 'delta', text }
          }
          const pending = pass.pending.trim()
          if (pending !== '' && pending !== lastPending) {
            lastPending = pending
            yield { type: 'partial', text: pending }
          } else if (pending === '' && lastPending !== null) {
            lastPending = null
          }
        }
      }
      if (stopped) return
      const tailBlock = resampler.flush()
      if (tailBlock !== null && tailBlock.length > 0) {
        if (releaseSession === null) releaseSession = await acquireEngineStreamSession()
        sessionStarted = true
        const pass = engine.streamProcess(tailBlock, { language, keywords })
        const text = pass.text.trim()
        if (text !== '') {
          committed += committed === '' ? text : ` ${text}`
          yield { type: 'delta', text }
        }
      }
      if (sessionStarted) {
        const stop = engine.streamStop()
        streamEnded = true
        const tail = stop.text.trim()
        if (tail !== '') {
          committed += committed === '' ? tail : ` ${tail}`
          yield { type: 'delta', text: tail }
        }
      }
      if (committed !== '') yield { type: 'final', text: committed }
    } finally {
      params.signal?.removeEventListener('abort', onAbort)
      if (releaseSession !== null) {
        if (sessionStarted && !streamEnded) {
          // Aborted or failed mid-session: stop the engine's stream so its
          // buffered state does not leak into the next session — which is
          // waiting on this gate right now. The consumer stopped listening,
          // so a failure here has nothing to report to.
          try {
            engine.streamStop()
          } catch (_error) {
            // Cleanup on an abandoned stream — nothing left to inform.
          }
        }
        releaseSession()
      }
    }
  }

  /**
   * Loads (or returns the cached) engine for this call, resolving URLs/paths
   * from config and env lazily.
   * @returns The ready engine.
   */
  private loadEngine(): ReturnType<typeof loadWhistleEngine> {
    const enginePath = this.config.enginePath ?? process.env.NEEDLE_ENGINE_PATH
    const wasmPath = this.config.wasmPath ?? process.env.NEEDLE_WASM_PATH
    if ((enginePath !== undefined) !== (wasmPath !== undefined)) {
      throw new Error(
        'enginePath and wasmPath must be set together (local needle.js and needle.wasm)',
      )
    }
    const jsUrl =
      this.config.engineUrl ?? process.env.WHISTLE_ENGINE_URL ?? DEFAULT_WHISTLE_ENGINE_URL
    const weightsUrl =
      this.config.weightsUrl ?? process.env.WHISTLE_WEIGHTS_URL ?? DEFAULT_WHISTLE_WEIGHTS_URL
    const weightsPath = this.config.weightsPath ?? process.env.NEEDLE_WHISTLE_WEIGHTS
    return loadWhistleEngine(
      {
        jsUrl,
        wasmUrl: new URL('needle.wasm', new URL(jsUrl, 'file:///whistle-shim/')).href,
        weightsUrl,
        ...(enginePath !== undefined ? { enginePath } : {}),
        ...(wasmPath !== undefined ? { wasmPath } : {}),
        ...(weightsPath !== undefined ? { weightsPath } : {}),
      },
      undefined,
      this.config.downloadTimeoutMs ?? 120_000,
    )
  }
}

/**
 * Creates a Whistle speech provider instance.
 * @param config - Optional overrides (URLs, local paths, language, keywords).
 * @returns An `AISpeechProvider` transcribing in-process via the WASM engine.
 */
export function createProvider(config?: WhistleSpeechConfig): AISpeechProvider {
  return new WhistleSpeechProvider(config)
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
