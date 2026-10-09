import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AIVoiceProvider, VoiceTranscriptEvent } from '@molecule/app-ai-voice'

import {
  DEFAULT_WHISTLE_ENGINE_URL,
  DEFAULT_WHISTLE_WEIGHTS_URL,
  loadWhistleEngine,
  WhistleEngineError,
} from '../engine.js'
import {
  createProvider,
  provider as lazyProvider,
  supportsRecognitionLanguage,
  WhistleVoiceProvider,
} from '../provider.js'

// --- Fake needle.js glue + engine files, served over a mocked fetch ---
//
// The fake glue is evaluated by the REAL loader path (fetch → new Function →
// createNeedle → _malloc/HEAPU8.set/_needle_load), so the tests exercise
// everything except the actual wasm. Behavior is steered per-test through
// globalThis.__whistleFake, dereferenced at CALL time (not captured), so a
// shared cached engine still follows each test's expectations.

const FAKE_GLUE = `
var createNeedle = async function () {
  var bump = 16
  var lastJson = ''
  return {
    HEAPU8: new Uint8Array(64 * 1024 * 1024),
    _malloc: function (n) {
      if (globalThis.__whistleFake.failMallocs) return 0
      var p = bump; bump += n; return p
    },
    _free: function () {},
    _needle_load: function (ptr, n) {
      globalThis.__whistleFake.loadCalls.push([ptr, Number(n)])
      return globalThis.__whistleFake.loadResult
    },
    _needle_models: function () { return globalThis.__whistleFake.modelsResult },
    _needle_last_error: function () { return 0 },
    UTF8ToString: function () { return lastJson },
    ccall: function (name, returnType, argTypes, args) {
      globalThis.__whistleFake.calls.push({ name: name, args: args })
      var ret = globalThis.__whistleFake.returnFor(name)
      lastJson = ret < 0 ? 'fake engine failure' : globalThis.__whistleFake.jsonFor(name)
      return ret
    },
  }
}
`

interface FakeEngineState {
  calls: Array<{ name: string; args: unknown[] }>
  loadCalls: Array<[number, number]>
  loadResult: number
  modelsResult: number
  /** When true, the fake `_malloc` returns 0 — a wasm heap that cannot fit the allocation. */
  failMallocs: boolean
  returnFor: (name: string) => number
  jsonFor: (name: string) => string
}

function freshFake(): FakeEngineState {
  return {
    calls: [],
    loadCalls: [],
    loadResult: 0,
    modelsResult: 2,
    failMallocs: false,
    returnFor: () => 1,
    jsonFor: (name) =>
      name === 'needle_transcribe'
        ? JSON.stringify({
            text: ' hello world ',
            language: 'en',
            ttft_ms: 40,
            decode_tps: 120,
          })
        : JSON.stringify({
            text: '',
            words: [],
            pending: '',
            language: 'en',
            received: 1,
            pass_ms: 50,
          }),
  }
}

const WASM_BYTES = new Uint8Array(64)
const WEIGHTS_BYTES = new Uint8Array(128)

let fake: FakeEngineState
let fetchLog: string[]

function mockFetch(input: RequestInfo | URL): Promise<Response> {
  const url = String(input)
  fetchLog.push(url)
  if (url.endsWith('needle.js')) {
    return Promise.resolve(new Response(FAKE_GLUE))
  }
  if (url.endsWith('needle.wasm')) {
    return Promise.resolve(
      new Response(WASM_BYTES, { headers: { 'content-length': String(WASM_BYTES.length) } }),
    )
  }
  if (url.endsWith('whistle.cact')) {
    return Promise.resolve(
      new Response(WEIGHTS_BYTES, { headers: { 'content-length': String(WEIGHTS_BYTES.length) } }),
    )
  }
  return Promise.reject(new Error(`unexpected fetch: ${url}`))
}

// --- Mock Web Audio / getUserMedia ---

interface MockProcessor {
  onaudioprocess: ((event: unknown) => void) | null
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}

let mockProcessor: MockProcessor | null = null
let closedContexts = 0
let stoppedTracks = 0
let contextSampleRate = 16000

class MockAudioContext {
  sampleRate: number
  destination = {}
  constructor(_options?: { sampleRate?: number }) {
    // Ignores the requested sampleRate like some browsers do (Firefox with a
    // ScriptProcessor graph) — the provider must resample to 16 kHz itself.
    this.sampleRate = contextSampleRate
  }
  createMediaStreamSource(): { connect: (n: unknown) => void; disconnect: () => void } {
    return { connect: vi.fn(), disconnect: vi.fn() }
  }
  createScriptProcessor(): MockProcessor {
    mockProcessor = {
      onaudioprocess: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
    return mockProcessor
  }
  async close(): Promise<void> {
    closedContexts++
  }
}

function makeStream(): { getTracks: () => Array<{ stop: () => void }> } {
  return {
    getTracks: () => [
      {
        stop: () => {
          stoppedTracks++
        },
      },
    ],
  }
}

let getUserMediaImpl: (() => Promise<unknown>) | null = null

function installBrowserEnv(): void {
  getUserMediaImpl = async () => makeStream()
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: (...args: unknown[]) => {
        void args
        return (getUserMediaImpl as () => Promise<unknown>)()
      },
    },
  })
  vi.stubGlobal('AudioContext', MockAudioContext)
}

/** Emits one ~256ms frame into the capture graph. */
function emitFrame(amplitude: number): void {
  const frame = new Float32Array(4096).fill(amplitude)
  mockProcessor?.onaudioprocess?.({ inputBuffer: { getChannelData: () => frame } })
}

async function startAndWaitForCapture(
  voice: WhistleVoiceProvider,
  handlers: Parameters<AIVoiceProvider['startListening']>[1],
): Promise<void> {
  voice.startListening(undefined, handlers)
  await vi.waitFor(() => {
    if (!mockProcessor) throw new Error('capture not started yet')
  })
}

function transcribeCalls(): Array<{ name: string; args: unknown[] }> {
  return fake.calls.filter((c) => c.name === 'needle_transcribe')
}

describe('WhistleVoiceProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProcessor = null
    closedContexts = 0
    stoppedTracks = 0
    contextSampleRate = 16000
    fake = freshFake()
    fetchLog = []
    vi.stubGlobal('__whistleFake', fake)
    vi.stubGlobal('fetch', mockFetch)
    installBrowserEnv()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('createProvider returns a WhistleVoiceProvider with name "whistle"', () => {
    const voice = createProvider()
    expect(voice).toBeInstanceOf(WhistleVoiceProvider)
    expect(voice.name).toBe('whistle')
  })

  it('the lazy provider proxy defers construction and exposes the interface', () => {
    expect(lazyProvider.name).toBe('whistle')
    expect(typeof lazyProvider.startListening).toBe('function')
  })

  it('supportsRecognitionLanguage maps BCP-47 tags to the seven covered codes', () => {
    expect(supportsRecognitionLanguage('en-US')).toBe(true)
    expect(supportsRecognitionLanguage('pl')).toBe(true)
    expect(supportsRecognitionLanguage('pt-BR')).toBe(false)
    expect(supportsRecognitionLanguage('ja')).toBe(false)
  })

  it('rejects a language Whistle does not cover before opening the mic', async () => {
    const voice = createProvider()
    const onError = vi.fn()
    voice.startListening({ language: 'pt-BR' }, { onError })
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'language-not-supported' }),
    )
    expect(mockProcessor).toBeNull()
    expect(fetchLog).toEqual([])
  })

  it('reports not-allowed when the mic permission is denied', async () => {
    getUserMediaImpl = async () => {
      throw new DOMException('denied', 'NotAllowedError')
    }
    const voice = createProvider()
    const onError = vi.fn()
    voice.startListening(undefined, { onError })
    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'not-allowed' }))
    })
    expect(voice.getState()).toBe('error')
  })

  it('transcribes a speech chunk closed by silence and emits a final transcript', async () => {
    const voice = createProvider()
    const transcripts: VoiceTranscriptEvent[] = []
    await startAndWaitForCapture(voice, { onTranscript: (e) => transcripts.push(e) })

    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)

    await vi.waitFor(() => {
      expect(transcripts).toHaveLength(1)
    })
    expect(transcripts[0]).toEqual({ transcript: 'hello world', isFinal: true, confidence: 1 })
    const call = transcribeCalls()[0]
    expect(call).toBeDefined()
    // 16 kHz context: passed through unresampled. The chunk carries the 3
    // speech frames PLUS the 4 trailing silent frames that closed it (0.8 s of
    // silence ≈ 3.125 frames — the 4th crosses the threshold), parakeet-style.
    expect(call.args[1]).toBe(7 * 4096)
    voice.dispose()
  })

  it('forces the requested language and passes config keywords + word timestamps', async () => {
    const voice = createProvider({
      keywords: ['Molecule', 'whistle bond'],
      wordTimestamps: true,
    })
    fake.jsonFor = () =>
      JSON.stringify({
        text: 'hello world',
        language: 'de',
        ttft_ms: 40,
        decode_tps: 120,
        words: [
          { word: 'hello', start: 0, end: 0.3, probability: 0.9 },
          { word: 'world', start: 0.3, end: 0.6, probability: 0.7 },
        ],
      })
    const transcripts: VoiceTranscriptEvent[] = []
    mockProcessor = null
    voice.startListening({ language: 'de-DE' }, { onTranscript: (e) => transcripts.push(e) })
    await vi.waitFor(() => {
      if (!mockProcessor) throw new Error('capture not started yet')
    })
    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)
    await vi.waitFor(() => {
      expect(transcripts).toHaveLength(1)
    })
    // confidence is the average word probability, not the 1 fallback
    expect(transcripts[0].confidence).toBeCloseTo(0.8, 5)
    const call = transcribeCalls()[0]
    expect(call.args[2]).toBe('de')
    expect(call.args[3]).toBe('Molecule\nwhistle bond')
    expect(call.args[4]).toBe(1)
    voice.dispose()
  })

  it('resamples chunks to 16 kHz when the AudioContext ignores the requested rate', async () => {
    contextSampleRate = 48000
    const voice = createProvider()
    const transcripts: VoiceTranscriptEvent[] = []
    await startAndWaitForCapture(voice, { onTranscript: (e) => transcripts.push(e) })
    for (let i = 0; i < 3; i++) emitFrame(0.1)
    // 0.8 s of silence at 48 kHz = 38400 samples ≈ 10 frames of 4096
    for (let i = 0; i < 11; i++) emitFrame(0)
    await vi.waitFor(() => {
      expect(transcripts).toHaveLength(1)
    })
    // The chunk closes at the 10th silent frame (40960 ≥ 38400): 13 frames of
    // 4096 at 48 kHz = 53248 samples → floor(53248/3) at 16 kHz
    expect(transcribeCalls()[0].args[1]).toBe(17749)
    voice.dispose()
  })

  it('emits nothing for silence — an empty transcript is not an error', async () => {
    fake.jsonFor = () => JSON.stringify({ text: '', language: '', ttft_ms: 0, decode_tps: 0 })
    const voice = createProvider()
    const onTranscript = vi.fn()
    const onError = vi.fn()
    await startAndWaitForCapture(voice, { onTranscript, onError })
    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)
    await vi.waitFor(() => {
      expect(transcribeCalls()).toHaveLength(1)
    })
    expect(onTranscript).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    voice.dispose()
  })

  it("is 'processing' during engine load, then 'listening' once ready", async () => {
    const states: string[] = []
    let releaseEngine: (() => void) | null = null
    const originalFetch = mockFetch
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      if (String(input).endsWith('whistle.cact')) {
        return new Promise<Response>((resolve) => {
          releaseEngine = () =>
            resolve(
              new Response(WEIGHTS_BYTES, {
                headers: { 'content-length': String(WEIGHTS_BYTES.length) },
              }),
            )
        }) as Promise<Response>
      }
      return originalFetch(input)
    })
    const voice = createProvider({ weightsUrl: 'https://example.test/whistle.cact' })
    await startAndWaitForCapture(voice, { onStateChange: (s) => states.push(s) })
    expect(voice.getState()).toBe('processing')
    ;(releaseEngine as unknown as () => void)()
    await vi.waitFor(() => {
      expect(voice.getState()).toBe('listening')
    })
    expect(states).toEqual(['processing', 'listening'])
    voice.dispose()
  })

  it('stopListening flushes in-progress speech so the last sentence is not lost', async () => {
    const voice = createProvider()
    const transcripts: VoiceTranscriptEvent[] = []
    await startAndWaitForCapture(voice, { onTranscript: (e) => transcripts.push(e) })

    for (let i = 0; i < 3; i++) emitFrame(0.1)
    voice.stopListening()

    await vi.waitFor(() => {
      expect(transcripts).toHaveLength(1)
    })
    expect(stoppedTracks).toBeGreaterThan(0)
    expect(closedContexts).toBeGreaterThan(0)
    voice.dispose()
  })

  it('reports engine download progress through onModelProgress', async () => {
    const events: Array<{ status: string; progress?: number; file?: string }> = []
    const voice = createProvider({
      weightsUrl: 'https://example.test/progress-whistle.cact',
      onModelProgress: (e) => events.push(e),
    })
    await startAndWaitForCapture(voice, {})
    await vi.waitFor(() => {
      expect(events.map((e) => e.status)).toContain('ready')
    })
    expect(events[0].status).toBe('loading')
    const downloading = events.filter((e) => e.status === 'downloading')
    expect(downloading.length).toBeGreaterThan(0)
    expect(downloading.every((e) => e.file === 'needle.wasm' || e.file === 'whistle.cact')).toBe(
      true,
    )
    expect(downloading.every((e) => e.progress === 100)).toBe(true)
    voice.dispose()
  })

  it('surfaces transcription failures as errors without stopping the session', async () => {
    fake.returnFor = (name) => (name === 'needle_transcribe' ? -1 : 1)
    fake.jsonFor = () => 'boom'
    // first chunk fails, second succeeds
    const voice = createProvider()
    const onError = vi.fn()
    const transcripts: VoiceTranscriptEvent[] = []
    await startAndWaitForCapture(voice, { onError, onTranscript: (e) => transcripts.push(e) })
    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)
    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'transcription-failed' }),
      )
    })
    fake.returnFor = () => 1
    fake.jsonFor = () =>
      JSON.stringify({ text: 'hello world', language: 'en', ttft_ms: 1, decode_tps: 1 })
    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)
    await vi.waitFor(() => expect(transcripts).toHaveLength(1))
    voice.dispose()
  })

  it('returns to "listening" after a transient transcription failure', async () => {
    // The session deliberately survives a failed pass ("without stopping the
    // session") — so the reported state must survive with it: stuck at
    // 'error', a consumer keyed on state hides a mic that is live and
    // transcribing again.
    fake.returnFor = (name) => (name === 'needle_transcribe' ? -1 : 1)
    const voice = createProvider()
    await startAndWaitForCapture(voice, { onError: () => {} })
    await vi.waitFor(() => expect(voice.getState()).toBe('listening'))
    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)
    await vi.waitFor(() => expect(voice.getState()).toBe('error'))

    // The failure was transient: the next pass succeeds and the session is live.
    fake.returnFor = () => 1
    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)
    await vi.waitFor(() => expect(voice.getState()).toBe('listening'))
    voice.dispose()
  })

  it('reports idle after dispose, not the stale in-session state', async () => {
    // dispose() tears the capture graph down and drops the queue; getState()
    // used to keep saying 'listening' for a provider that can never listen
    // again.
    const voice = createProvider()
    await startAndWaitForCapture(voice, {})
    await vi.waitFor(() => expect(voice.getState()).toBe('listening'))
    voice.dispose()
    expect(voice.getState()).toBe('idle')
  })

  it('does not report start-failed for a session the user already stopped', async () => {
    // startListening → stopListening while the engine download is still in
    // flight → the download then FAILS. The failure path used to fire
    // unconditionally: state idle → 'error' plus an onError for a start the
    // user had already abandoned.
    let releaseWeights: (() => void) | null = null
    fake.loadResult = -1 // the load fails the moment it is allowed to finish
    // A dedicated source: the default-URL engine is already cached by earlier
    // tests in this file, and a cached load would never fetch (or fail) here.
    const weightsUrl = 'https://example.test/abandoned-whistle.cact'
    const originalFetch = mockFetch
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      if (String(input) === weightsUrl) {
        return new Promise<Response>((resolve) => {
          releaseWeights = () =>
            resolve(
              new Response(WEIGHTS_BYTES, {
                headers: { 'content-length': String(WEIGHTS_BYTES.length) },
              }),
            )
        }) as Promise<Response>
      }
      return originalFetch(input)
    })
    const voice = createProvider({ weightsUrl })
    const onError = vi.fn()
    voice.startListening(undefined, { onError })
    await vi.waitFor(() => {
      if (!mockProcessor) throw new Error('capture not started yet')
    })
    voice.stopListening()
    expect(voice.getState()).toBe('idle')

    releaseWeights!()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(onError).not.toHaveBeenCalled()
    expect(voice.getState()).toBe('idle')
  })

  it('reports start-failed when the weights cannot be loaded, and a retry works', async () => {
    fake.loadResult = -1
    const voice = createProvider({
      weightsUrl: 'https://example.test/broken-whistle.cact',
    })
    const onError = vi.fn()
    voice.startListening(undefined, { onError })
    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'start-failed' }))
    })
    expect(voice.getState()).toBe('error')

    // The failed load was evicted from the engine cache — a fresh provider
    // with the same URL loads successfully once the failure is gone.
    fake.loadResult = 0
    const voice2 = createProvider({
      weightsUrl: 'https://example.test/broken-whistle.cact',
    })
    const onError2 = vi.fn()
    mockProcessor = null
    voice2.startListening(undefined, { onError: onError2 })
    await vi.waitFor(() => {
      if (!mockProcessor) throw new Error('capture not started yet')
    })
    await vi.waitFor(() => {
      expect(voice2.getState()).toBe('listening')
    })
    voice.dispose()
    voice2.dispose()
  })

  it('fails a transcription whose audio allocation cannot fit as a typed engine error', async () => {
    // `_malloc` returns 0 when the heap cannot fit an allocation; writing
    // anyway used to land the audio at offset 0 — the engine's static area —
    // corrupting it silently. The call must fail as the typed error instead.
    const engine = await loadWhistleEngine({
      jsUrl: DEFAULT_WHISTLE_ENGINE_URL,
      weightsUrl: 'https://example.test/alloc-whistle.cact',
    })
    fake.failMallocs = true
    expect(() => engine.transcribe(new Float32Array(1600))).toThrow(WhistleEngineError)
    expect(() => engine.transcribe(new Float32Array(1600))).toThrow(/could not fit the audio/)
    fake.failMallocs = false
    expect(() => engine.transcribe(new Float32Array(1600))).not.toThrow()
  })

  it('recovers on the SAME provider when a failed engine load is retried', async () => {
    // A transient download failure on first use must not poison this
    // provider's engine memo: the loader evicts a failed load so the next
    // call retries, and startListening on the same instance must ride that
    // retry instead of failing forever with the stale rejection.
    fake.loadResult = -1
    const weightsUrl = 'https://example.test/retry-whistle.cact'
    const voice = createProvider({ weightsUrl })
    const onError = vi.fn()
    voice.startListening(undefined, { onError })
    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'start-failed' }))
    })
    expect(voice.getState()).toBe('error')

    // The failure is gone — the SAME provider listens on its next start.
    fake.loadResult = 0
    mockProcessor = null
    voice.startListening(undefined, { onError })
    await vi.waitFor(() => {
      expect(voice.getState()).toBe('listening')
    })
    expect(onError).toHaveBeenCalledTimes(1)
    voice.dispose()
  })

  it('refuses clips longer than 30 s per pass at the engine boundary', async () => {
    const engine = await loadWhistleEngine({
      jsUrl: DEFAULT_WHISTLE_ENGINE_URL,
      weightsUrl: DEFAULT_WHISTLE_WEIGHTS_URL,
    })
    const tooLong = new Float32Array(30 * 16000 + 1)
    expect(() => engine.transcribe(tooLong)).toThrow(WhistleEngineError)
    expect(() => engine.transcribe(tooLong)).toThrow(/at most 30/)
    // a 30 s clip exactly is accepted
    expect(() => engine.transcribe(new Float32Array(30 * 16000))).not.toThrow()
  })

  it('flushes a chunk at the configured maxChunkSeconds cap', async () => {
    const voice = createProvider({ maxChunkSeconds: 1 })
    const transcripts: VoiceTranscriptEvent[] = []
    await startAndWaitForCapture(voice, { onTranscript: (e) => transcripts.push(e) })
    // 4 frames of 4096 @ 16 kHz ≈ 1.02 s — crosses the 1 s cap mid-speech
    for (let i = 0; i < 5; i++) emitFrame(0.1)
    await vi.waitFor(() => {
      expect(transcribeCalls()).toHaveLength(1)
    })
    voice.dispose()
  })

  it('dispose releases the microphone and ignores later frames', async () => {
    const voice = createProvider()
    const onTranscript = vi.fn()
    await startAndWaitForCapture(voice, { onTranscript })
    voice.dispose()
    expect(stoppedTracks).toBeGreaterThan(0)
    emitFrame(0.1)
    await new Promise((r) => setTimeout(r, 50))
    expect(onTranscript).not.toHaveBeenCalled()
  })

  it('the engine is loaded once per source and shared across providers', async () => {
    const weightsUrl = 'https://example.test/shared-whistle.cact'
    const voice1 = createProvider({ weightsUrl })
    const voice2 = createProvider({ weightsUrl })
    const transcripts: VoiceTranscriptEvent[] = []
    await startAndWaitForCapture(voice1, { onTranscript: (e) => transcripts.push(e) })
    mockProcessor = null
    voice2.startListening(undefined, { onTranscript: (e) => transcripts.push(e) })
    await vi.waitFor(() => {
      if (!mockProcessor) throw new Error('capture not started yet')
    })
    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)
    await vi.waitFor(() => {
      expect(transcripts).toHaveLength(1)
    })
    // one weights fetch for both providers — the second reused the engine
    expect(fetchLog.filter((u) => u === weightsUrl)).toHaveLength(1)
    expect(fetchLog.filter((u) => u === DEFAULT_WHISTLE_ENGINE_URL)).toHaveLength(1)
    expect(fake.loadCalls).toHaveLength(1)
    expect(fake.loadCalls[0][1]).toBe(WEIGHTS_BYTES.length)
    voice1.dispose()
    voice2.dispose()
  })

  it('fails a download that dies mid-stream as a typed download-failed error', async () => {
    // A connection reset after the headers happens INSIDE the body transfer:
    // it must surface as the same typed WhistleEngineError('download-failed')
    // every other fetch failure produces, not a raw TypeError.
    const weightsUrl = 'https://example.test/truncated-whistle.cact'
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input)
      fetchLog.push(url)
      if (url === weightsUrl) {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2, 3]))
            controller.error(new Error('connection reset mid-body'))
          },
        })
        return Promise.resolve(new Response(stream, { headers: { 'content-length': '128' } }))
      }
      return mockFetch(input)
    })
    const error = (await loadWhistleEngine({
      jsUrl: DEFAULT_WHISTLE_ENGINE_URL,
      weightsUrl,
    }).then(
      () => null,
      (e: unknown) => e,
    )) as WhistleEngineError | null
    expect(error).toBeInstanceOf(WhistleEngineError)
    expect(error!.code).toBe('download-failed')
    expect(error!.message).toContain('mid-stream')
  })

  it('refuses a non-ok glue fetch as download-failed instead of evaluating the body', async () => {
    // The Node fallback path fetches the glue source itself; a mirror's 404
    // HTML page must fail as the typed download error, never reach `new
    // Function`.
    const jsUrl = 'https://example.test/missing-needle.js'
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input)
      fetchLog.push(url)
      if (url === jsUrl) {
        return Promise.resolve(new Response('<html>not found</html>', { status: 404 }))
      }
      return mockFetch(input)
    })
    const error = (await loadWhistleEngine({
      jsUrl,
      weightsUrl: 'https://example.test/w.cact',
    }).then(
      () => null,
      (e: unknown) => e,
    )) as WhistleEngineError | null
    expect(error).toBeInstanceOf(WhistleEngineError)
    expect(error!.code).toBe('download-failed')
    expect(error!.message).toContain('404')
  })

  it('a replaced utterance does not tear down the speaking state of its replacement', async () => {
    // `speak()` calls synth.cancel() before starting the new utterance, and
    // the UA fires the interrupted utterance's end event a beat later. The
    // replaced utterance's handler used to flip the shared state to 'idle'
    // while the NEW audio was still playing (and fire onSpeakEnd early).
    class FakeUtterance {
      lang = ''
      rate = 1
      pitch = 1
      volume = 1
      onend: (() => void) | null = null
      onerror: ((event: { error: string }) => void) | null = null
      constructor(public text: string) {}
    }
    const spoken: InstanceType<typeof FakeUtterance>[] = []
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [],
      cancel: () => {
        // The UA reports the interruption asynchronously — the new utterance
        // is already speaking when the old one's end event lands.
        const previous = spoken[spoken.length - 1]
        if (previous) queueMicrotask(() => previous.onend?.())
      },
      speak: (u: InstanceType<typeof FakeUtterance>) => {
        spoken.push(u)
      },
    })

    const voice = createProvider()
    const p1 = voice.speak('one')
    expect(voice.getState()).toBe('speaking')
    const p2 = voice.speak('two')
    // Drain microtasks so the replaced utterance's end event runs.
    await new Promise((resolve) => setTimeout(resolve, 0))
    await p1 // the interrupted utterance still settles (resolved, not rejected)
    // The replacement must still be speaking — not idled by utterance one.
    expect(voice.getState()).toBe('speaking')
    spoken[1]!.onend?.()
    await p2
    expect(voice.getState()).toBe('idle')
  })
})
