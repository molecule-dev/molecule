/**
 * Whistle WASM engine loader — fetches the Cactus `needle` WebAssembly build
 * (`needle.js` glue + `needle.wasm`) and the `whistle.cact` weights, loads
 * them into one process-global engine instance, and wraps the C API
 * (`needle_transcribe`, `needle_stream_transcribe_*`) as typed calls.
 *
 * The engine is process-global and not thread-safe ("one model per process");
 * this module caches a single instance per source combination so every
 * provider shares it.
 *
 * @module
 */

import type { ModelProgressEvent } from './types.js'

/** Default URL of the `needle.js` WASM glue (Hugging Face mirror). */
export const DEFAULT_WHISTLE_ENGINE_URL =
  'https://huggingface.co/Cactus-Compute/needle3/resolve/main/wasm/needle.js'

/** Default URL of the `whistle.cact` weights (16.9 MB, Hugging Face). */
export const DEFAULT_WHISTLE_WEIGHTS_URL =
  'https://huggingface.co/Cactus-Compute/whistle/resolve/main/whistle.cact'

/** Sample rate Whistle transcribes (16 kHz mono float PCM). */
export const WHISTLE_SAMPLE_RATE = 16000

/** Longest clip one `needle_transcribe` pass accepts. */
export const WHISTLE_MAX_CLIP_SECONDS = 30

/** Capacity of the JSON output buffer shared by all engine calls. */
const OUT_CAPACITY_BYTES = 1 << 20

/**
 * Deadline for the `<script>`-tag glue load. Browsers impose NO time limit on
 * a script load, and this is the one download path in the loader with no
 * deadline of its own (every `fetch` here is `AbortSignal.timeout`-bounded) —
 * a mirror that accepts the connection but never answers would otherwise leave
 * `loadWhistleEngine()` pending forever, and every `startListening()` waiting
 * on it stuck in `'processing'` until the page reloads.
 */
const SCRIPT_LOAD_TIMEOUT_MS = 120_000

/**
 * Error thrown when the Whistle engine cannot be loaded or a call fails.
 * `code` names the stage: `download-failed`, `load-failed`,
 * `transcribe-failed`, `stream-failed`.
 */
export class WhistleEngineError extends Error {
  /** Which stage failed. */
  readonly code: 'download-failed' | 'load-failed' | 'transcribe-failed' | 'stream-failed'

  /**
   * Create the error.
   * @param code - The failing stage.
   * @param message - Human-readable message.
   * @param cause - The underlying error, if any.
   */
  constructor(code: WhistleEngineError['code'], message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'WhistleEngineError'
    this.code = code
  }
}

/** One transcribed word with timing and confidence. */
export interface WhistleWord {
  /** The word (includes its trailing punctuation). */
  word: string
  /** Start time in seconds from the start of the clip. */
  start: number
  /** End time in seconds from the start of the clip. */
  end: number
  /** Decoder confidence for this word, 0 to 1. */
  probability: number
}

/** Result of one `needle_transcribe` call, as returned by the engine. */
export interface WhistleTranscript {
  /** The transcript. Silence/steady noise gives `''`. */
  text: string
  /** Detected or forced language (`''` for silence). */
  language: string
  /** Milliseconds to the first token. */
  ttft_ms: number
  /** Decoder tokens per second after the first token. */
  decode_tps: number
  /** Per-word timing, present when word timestamps were requested. */
  words?: WhistleWord[]
}

/** Result of one `needle_stream_transcribe_process` / `_stop` call. */
export interface WhistleStreamResult {
  /** Words this call committed (agreed on by two consecutive passes). */
  text: string
  /** The committed words with timings. */
  words: WhistleWord[]
  /** The unconfirmed tail (may still be revised by later passes). */
  pending: string
  /** Language used for the stream (`''` for silence). */
  language: string
  /** Seconds of audio the stream has received. */
  received: number
  /** Wall milliseconds this pass took. */
  pass_ms: number
}

/** Where the engine's three files come from. */
export interface WhistleEngineSource {
  /** URL of `needle.js`; `needle.wasm` is resolved from the same directory. */
  jsUrl: string
  /** URL of the `whistle.cact` weights. */
  weightsUrl: string
}

/** The glue's async factory: `createNeedle({ wasmBinary })` → module. */
type NeedleFactory = (moduleArg: { wasmBinary: ArrayBuffer }) => Promise<NeedleModule>

/** The minimal shape of the Emscripten module the glue returns. */
interface NeedleModule {
  HEAPU8: Uint8Array
  _malloc(bytes: number): number
  _free(ptr: number): void
  _needle_load(ptr: number, bytes: bigint): number
  _needle_models(): number
  _needle_last_error(): number
  ccall(
    ident: string,
    returnType: 'number',
    argTypes: string[],
    args: unknown[],
    opts?: { async?: boolean },
  ): number
  UTF8ToString(ptr: number): string
}

/** Options the engine calls accept for language and keyword biasing. */
export interface WhistleEngineCallOptions {
  /** ISO 639-1 language to force, or null to detect. */
  language?: string | null
  /** Keywords as an array or newline-separated string, or null for none. */
  keywords?: string[] | string | null
}

/** The loaded engine, ready to transcribe. */
export interface WhistleEngine {
  /** Transcribes 16 kHz mono float PCM (≤ 30 s per call). */
  transcribe(
    pcm: Float32Array,
    options?: WhistleEngineCallOptions & { wordTimestamps?: boolean },
  ): WhistleTranscript
  /** Appends ~1 s of PCM to the live stream; commits agreed words. */
  streamProcess(pcm: Float32Array, options?: WhistleEngineCallOptions): WhistleStreamResult
  /** Ends the stream, committing the tail; the next process call starts fresh. */
  streamStop(): WhistleStreamResult
}

/**
 * Normalizes keywords: an array becomes newline-separated (the engine's
 * format); a string is passed through.
 * @param keywords - Keywords as array or newline-separated string.
 * @returns The newline-separated string, or null when absent/empty.
 */
export function normalizeKeywords(keywords: string[] | string | null | undefined): string | null {
  if (keywords === undefined || keywords === null) return null
  const joined = Array.isArray(keywords) ? keywords.join('\n') : keywords
  return joined.length > 0 ? joined : null
}

/**
 * Fetches a URL as bytes, reporting download progress when the response
 * carries a content length.
 * @param url - The URL to fetch.
 * @param file - File label for progress events.
 * @param onProgress - Progress sink.
 * @param timeoutMs - Abort the fetch after this many milliseconds.
 * @returns The response bytes.
 */
async function fetchBytes(
  url: string,
  file: string,
  onProgress?: (event: ModelProgressEvent) => void,
  timeoutMs = 120_000,
): Promise<Uint8Array> {
  let response: Response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    throw new WhistleEngineError(
      'download-failed',
      `Whistle engine file ${file} could not be fetched from ${url}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error,
    )
  }
  if (!response.ok) {
    // Release the error response's body (and with it its socket): an
    // unconsumed body holds its connection until GC reclaims it, and a
    // misconfigured URL fails here on EVERY load attempt until fixed.
    await response.body?.cancel().catch((_error: unknown) => {
      // The typed error below is what matters.
    })
    throw new WhistleEngineError(
      'download-failed',
      `Whistle engine file ${file} fetch failed: HTTP ${response.status} from ${url}`,
    )
  }
  // The body transfer is part of the download: a connection that dies
  // mid-stream must fail as the typed `download-failed` error every other
  // fetch failure produces, not escape as a raw `TypeError: terminated` no
  // caller can classify.
  try {
    const total = Number(response.headers.get('content-length') ?? 0)
    if (!response.body || total <= 0) {
      return new Uint8Array(await response.arrayBuffer())
    }
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      onProgress?.({
        status: 'downloading',
        progress: Math.min(100, Math.round((loaded / total) * 100)),
        file,
      })
    }
    const all = new Uint8Array(loaded)
    let offset = 0
    for (const chunk of chunks) {
      all.set(chunk, offset)
      offset += chunk.length
    }
    return all
  } catch (error) {
    // Release the half-read body best-effort.
    await response.body?.cancel().catch((_error: unknown) => {
      // The typed error below is what matters.
    })
    throw new WhistleEngineError(
      'download-failed',
      `Whistle engine file ${file} download failed mid-stream from ${url}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error,
    )
  }
}

/**
 * Obtains the glue's `createNeedle` factory.
 *
 * - When the app already loaded `needle.js` via its own `<script>` tag
 *   (present as `globalThis.createNeedle`), reuse it.
 * - In a browser, inject a `<script>` tag (CSP `script-src` governs it — no
 *   `unsafe-eval` needed).
 * - Elsewhere (Node, tests), fetch the source and evaluate it in a function
 *   scope with stub `require`/`__dirname` parameters: the glue calls
 *   `require('node:fs')` eagerly in its Node branch but never uses the result
 *   when `wasmBinary` is passed, so a stub satisfies it.
 * @param jsUrl - URL of `needle.js`.
 * @returns The async `createNeedle(moduleArg)` factory.
 */
async function loadCreateNeedle(jsUrl: string): Promise<NeedleFactory> {
  const globalScope = globalThis as { createNeedle?: unknown }
  if (typeof globalScope.createNeedle === 'function') {
    return globalScope.createNeedle as NeedleFactory
  }
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = jsUrl
      script.async = true
      // Bounded like every other download here (see SCRIPT_LOAD_TIMEOUT_MS):
      // without a deadline a hung mirror never fires onerror — browsers impose
      // no script-load limit — and the engine load never settles. The element
      // is removed on failure so a load that lands after the caller gave up
      // cannot keep a dead attempt's state around.
      const timer = setTimeout(() => {
        script.remove()
        reject(
          new WhistleEngineError(
            'download-failed',
            `Whistle engine glue load from ${jsUrl} timed out after ${SCRIPT_LOAD_TIMEOUT_MS} ms (script tag — check CSP script-src and the mirror)`,
          ),
        )
      }, SCRIPT_LOAD_TIMEOUT_MS)
      script.onload = () => {
        clearTimeout(timer)
        resolve()
      }
      script.onerror = () => {
        clearTimeout(timer)
        script.remove()
        reject(
          new WhistleEngineError(
            'download-failed',
            `Whistle engine glue could not be loaded from ${jsUrl} (script tag failed — check CSP script-src)`,
          ),
        )
      }
      document.head.appendChild(script)
    })
    if (typeof globalScope.createNeedle === 'function') {
      return globalScope.createNeedle as NeedleFactory
    }
    throw new WhistleEngineError(
      'load-failed',
      `Whistle engine glue loaded from ${jsUrl} but exposed no createNeedle global`,
    )
  }
  let source: string
  try {
    const response = await fetch(jsUrl, { signal: AbortSignal.timeout(120_000) })
    if (!response.ok) {
      // Same release as fetchBytes: an unconsumed error body strands its
      // connection until GC reclaims it.
      await response.body?.cancel().catch((_error: unknown) => {
        // The typed error below is what matters.
      })
      throw new WhistleEngineError(
        'download-failed',
        `Whistle engine glue fetch failed: HTTP ${response.status} from ${jsUrl}`,
      )
    }
    source = await response.text()
  } catch (error) {
    // Already typed (the !ok branch above) — pass through; anything else is a
    // network/abort failure of this same download and must be typed as one.
    if (error instanceof WhistleEngineError) throw error
    throw new WhistleEngineError(
      'download-failed',
      `Whistle engine glue could not be fetched from ${jsUrl}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error,
    )
  }
  // Stub require: called eagerly (`require("node:fs")`) but its result is only
  // used by read paths we bypass by passing `wasmBinary`.
  const stubRequire = (): undefined => undefined
  try {
    const evaluate = new Function(
      'require',
      '__dirname',
      '__filename',
      `${source};return createNeedle`,
    ) as (req: () => undefined, dir: string, file: string) => NeedleFactory
    return evaluate(stubRequire, '/whistle-shim', '/whistle-shim/needle.js')
  } catch (error) {
    // A 200 body that is not the glue (a mirror's HTML interstitial) dies here
    // as a raw SyntaxError — surface it as the load failure it is.
    throw new WhistleEngineError(
      'load-failed',
      `the fetched needle.js glue did not evaluate: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error,
    )
  }
}

/** Cache of loaded engines, keyed by `jsUrl + '\0' + weightsUrl`. */
const engineCache = new Map<string, Promise<WhistleEngine>>()

/**
 * Loads (or returns the cached) Whistle engine: one wasm instance per source
 * combination, shared by every provider in the process. A failed load is
 * evicted so the next call retries.
 * @param source - Where the engine files come from.
 * @param onProgress - Download/initialization progress sink.
 * @returns The ready engine.
 */
export function loadWhistleEngine(
  source: WhistleEngineSource,
  onProgress?: (event: ModelProgressEvent) => void,
): Promise<WhistleEngine> {
  const key = `${source.jsUrl}\0${source.weightsUrl}`
  const cached = engineCache.get(key)
  if (cached) return cached

  const promise = (async (): Promise<WhistleEngine> => {
    onProgress?.({ status: 'loading' })
    const wasmUrl = new URL('needle.wasm', new URL(source.jsUrl, 'file:///whistle-shim/')).href
    const [createNeedle, wasmBytes, weightsBytes] = await Promise.all([
      loadCreateNeedle(source.jsUrl),
      fetchBytes(wasmUrl, 'needle.wasm', onProgress),
      fetchBytes(source.weightsUrl, 'whistle.cact', onProgress),
    ])

    const module = await createNeedle({
      wasmBinary: wasmBytes.buffer.slice(
        wasmBytes.byteOffset,
        wasmBytes.byteOffset + wasmBytes.byteLength,
      ) as ArrayBuffer,
    })

    // `_malloc` returns 0 when the wasm heap cannot fit the allocation (the C
    // malloc convention). Writing anyway would land at offset 0 — the engine's
    // static/stack area — and corrupt it silently, so every allocation is
    // checked and a failure surfaces as the typed error for its stage.
    const alloc = (bytes: number, what: string): number => {
      const ptr = module._malloc(bytes)
      if (!ptr) {
        throw new WhistleEngineError(
          'load-failed',
          `the engine's wasm heap could not fit ${what} (${bytes} bytes)`,
        )
      }
      return ptr
    }
    const weightsPtr = alloc(weightsBytes.byteLength, 'the whistle weights')
    module.HEAPU8.set(weightsBytes, weightsPtr)
    const loaded = module._needle_load(weightsPtr, BigInt(weightsBytes.byteLength))
    // The weights buffer stays allocated for the process lifetime: freeing it
    // right after load is undocumented engine behavior, and the engine may
    // keep referencing the bytes.
    if (loaded < 0) {
      const reason = module.UTF8ToString(module._needle_last_error())
      throw new WhistleEngineError('load-failed', `Whistle weights load failed: ${reason}`)
    }
    const NEEDLE_SPEECH = 2
    if ((module._needle_models() & NEEDLE_SPEECH) === 0) {
      throw new WhistleEngineError(
        'load-failed',
        'the loaded .cact file carries no speech model — expected whistle.cact',
      )
    }
    onProgress?.({ status: 'ready' })

    const outPtr = alloc(OUT_CAPACITY_BYTES, 'the transcript output buffer')
    const readOut = (): string => module.UTF8ToString(outPtr)

    const callEngine = (
      ident: string,
      argTypes: string[],
      args: unknown[],
      failureCode: WhistleEngineError['code'],
    ): number => {
      const ret = module.ccall(ident, 'number', argTypes, args)
      if (ret < 0) {
        throw new WhistleEngineError(
          failureCode,
          `${ident} failed: ${module.UTF8ToString(module._needle_last_error())}`,
        )
      }
      return ret
    }

    const withPcm = (pcm: Float32Array, failureCode: WhistleEngineError['code']): number => {
      const bytes = pcm.length * 4
      const ptr = module._malloc(bytes)
      if (!ptr) {
        throw new WhistleEngineError(
          failureCode,
          `the engine's wasm heap could not fit the audio (${bytes} bytes)`,
        )
      }
      new Float32Array(module.HEAPU8.buffer, ptr, pcm.length).set(pcm)
      return ptr
    }

    return {
      transcribe(pcm, options = {}) {
        if (pcm.length > WHISTLE_MAX_CLIP_SECONDS * WHISTLE_SAMPLE_RATE) {
          throw new WhistleEngineError(
            'transcribe-failed',
            `clip is ${pcm.length / WHISTLE_SAMPLE_RATE}s; Whistle transcribes at most ${WHISTLE_MAX_CLIP_SECONDS}s per pass — chunk the audio`,
          )
        }
        const ptr = withPcm(pcm, 'transcribe-failed')
        try {
          callEngine(
            'needle_transcribe',
            ['number', 'number', 'string', 'string', 'number', 'number', 'number'],
            [
              ptr,
              pcm.length,
              options.language ?? null,
              normalizeKeywords(options.keywords),
              options.wordTimestamps ? 1 : 0,
              outPtr,
              OUT_CAPACITY_BYTES,
            ],
            'transcribe-failed',
          )
          return JSON.parse(readOut()) as WhistleTranscript
        } finally {
          module._free(ptr)
        }
      },
      streamProcess(pcm, options = {}) {
        const ptr = withPcm(pcm, 'stream-failed')
        try {
          callEngine(
            'needle_stream_transcribe_process',
            ['number', 'number', 'string', 'string', 'number', 'number'],
            [
              ptr,
              pcm.length,
              options.language ?? null,
              normalizeKeywords(options.keywords),
              outPtr,
              OUT_CAPACITY_BYTES,
            ],
            'stream-failed',
          )
          return JSON.parse(readOut()) as WhistleStreamResult
        } finally {
          module._free(ptr)
        }
      },
      streamStop() {
        callEngine(
          'needle_stream_transcribe_stop',
          ['number', 'number'],
          [outPtr, OUT_CAPACITY_BYTES],
          'stream-failed',
        )
        return JSON.parse(readOut()) as WhistleStreamResult
      },
    }
  })()

  // A failed load must not poison the cache — evict so the next call retries
  // (the caller already receives the rejection).
  promise.catch(() => {
    onProgress?.({ status: 'error' })
    engineCache.delete(key)
  })
  engineCache.set(key, promise)
  return promise
}
