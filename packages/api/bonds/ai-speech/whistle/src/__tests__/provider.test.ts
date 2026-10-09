import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TranscriptionStreamEvent } from '@molecule/api-ai-speech'

import { DEFAULT_WHISTLE_ENGINE_URL, WhistleEngineError } from '../engine.js'
import { WHISTLE_SAMPLE_RATE } from '../engine.js'
import { createProvider, provider as lazyProvider } from '../provider.js'
import { aiSpeechWhistleSecretDefinitions } from '../secrets.js'

// --- Fake needle.js glue + engine files, served over a mocked fetch ---
//
// The fake glue is evaluated by the REAL loader path (fetch → new Function →
// createNeedle → _malloc/HEAPU8.set/_needle_load), so the tests exercise
// everything except the actual wasm. Behavior is steered per-test through
// globalThis.__whistleFake, dereferenced at CALL time; jsonFor receives a
// per-function call counter for sequencing stream passes.

const FAKE_GLUE = `
var createNeedle = async function () {
  var bump = 16
  var lastJson = ''
  var mod = {
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
      var hook = globalThis.__whistleFake
      hook.counts[name] = (hook.counts[name] || 0) + 1
      var count = hook.counts[name]
      // First float of the audio the call was handed — lets a test tell WHICH
      // stream session a process call belonged to (the provider copies the
      // caller's PCM into the heap at args[0] before every audio call).
      var marker = null
      if (name === 'needle_transcribe' || name === 'needle_stream_transcribe_process') {
        marker = new Float32Array(mod.HEAPU8.buffer, args[0], 1)[0]
      }
      hook.calls.push({ name: name, args: args, call: count, marker: marker })
      var ret = hook.returnFor(name, count)
      lastJson = ret < 0 ? 'fake engine failure' : hook.jsonFor(name, count)
      return ret
    },
  }
  return mod
}
`

interface FakeEngineState {
  calls: Array<{ name: string; args: unknown[]; call: number; marker: number | null }>
  counts: Record<string, number>
  loadCalls: Array<[number, number]>
  loadResult: number
  modelsResult: number
  /** When true, the fake `_malloc` returns 0 — a wasm heap that cannot fit the allocation. */
  failMallocs: boolean
  returnFor: (name: string, call: number) => number
  jsonFor: (name: string, call: number) => string
}

function freshFake(): FakeEngineState {
  return {
    calls: [],
    counts: {},
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
            words: [
              { word: 'hello', start: 0, end: 0.5, probability: 0.9 },
              { word: 'world', start: 0.5, end: 1, probability: 0.8 },
            ],
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

/**
 * Builds a 16-bit mono WAV carrying `seconds` of near-silence.
 * @param seconds - Length in seconds.
 * @param sampleRate - WAV sample rate (default 16 kHz).
 * @returns WAV bytes.
 */
function silenceWav(seconds: number, sampleRate = WHISTLE_SAMPLE_RATE): Uint8Array {
  const frames = seconds * sampleRate
  const dataBytes = frames * 2
  const out = new Uint8Array(44 + dataBytes)
  const view = new DataView(out.buffer)
  const write = (text: string, at: number): void => {
    for (let i = 0; i < text.length; i++) view.setUint8(at + i, text.charCodeAt(i))
  }
  write('RIFF', 0)
  view.setUint32(4, 36 + dataBytes, true)
  write('WAVE', 8)
  write('fmt ', 12)
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write('data', 36)
  view.setUint32(40, dataBytes, true)
  for (let i = 0; i < frames; i++) view.setInt16(44 + i * 2, i % 1000, true)
  return out
}

/**
 * Wraps PCM16 bytes as one async iterable chunk.
 * @param bytes - The PCM16 bytes.
 * @param split - Chunk size in bytes.
 * @yields {Uint8Array} Consecutive byte slices.
 */
async function* chunksOf(bytes: Uint8Array, split = 8192): AsyncGenerator<Uint8Array> {
  for (let offset = 0; offset < bytes.length; offset += split) {
    yield bytes.subarray(offset, Math.min(offset + split, bytes.length))
  }
}

const ENV_KEYS = [
  'WHISTLE_ENGINE_URL',
  'WHISTLE_WEIGHTS_URL',
  'NEEDLE_WHISTLE_WEIGHTS',
  'NEEDLE_ENGINE_PATH',
  'NEEDLE_WASM_PATH',
] as const

let tmpDir: string | null = null

describe('WhistleSpeechProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fake = freshFake()
    fetchLog = []
    vi.stubGlobal('__whistleFake', fake)
    vi.stubGlobal('fetch', mockFetch)
    for (const key of ENV_KEYS) delete process.env[key]
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    for (const key of ENV_KEYS) delete process.env[key]
    if (tmpDir !== null) {
      rmSync(tmpDir, { recursive: true, force: true })
      tmpDir = null
    }
  })

  it('createProvider returns a provider with the whistle surface', () => {
    const speech = createProvider()
    expect(speech.name).toBe('whistle')
    expect(speech.streamingAppendOnly).toBe(true)
    expect(speech.transcribe).toBeTypeOf('function')
    expect(speech.transcribeStream).toBeTypeOf('function')
    expect(speech.synthesize).toBeUndefined()
    expect(speech.translate).toBeUndefined()
    expect(speech.diarize).toBeUndefined()
  })

  it('the lazy provider proxy defers construction and exposes the interface', async () => {
    expect(lazyProvider.name).toBe('whistle')
    await expect(lazyProvider.transcribe!({ audio: silenceWav(1) })).resolves.toHaveProperty(
      'text',
      'hello world',
    )
  })

  it('transcribes WAV, mapping text, language, duration, segments and word times', async () => {
    const speech = createProvider()
    const result = await speech.transcribe!({
      audio: silenceWav(2),
      timestampGranularity: 'word',
    })
    expect(result.text).toBe('hello world')
    expect(result.language).toBe('en')
    expect(result.duration).toBeCloseTo(2, 5)
    expect(result.segments).toEqual([{ id: 0, start: 0, end: 2, text: 'hello world' }])
    expect(result.words).toEqual([
      { word: 'hello', start: 0, end: 0.5 },
      { word: 'world', start: 0.5, end: 1 },
    ])
    const call = fake.calls.find((c) => c.name === 'needle_transcribe')
    expect(call).toBeDefined()
    expect(call.args[1]).toBe(2 * WHISTLE_SAMPLE_RATE)
    expect(call.args[2]).toBeNull() // auto-detect
    expect(call.args[3]).toBeNull() // no keywords
    expect(call.args[4]).toBe(1) // word timestamps requested
  })

  it('forces a supported BCP-47 language and passes prompt as keyword biasing', async () => {
    const speech = createProvider()
    await speech.transcribe!({ audio: silenceWav(1), language: 'de-DE', prompt: 'Acme' })
    const call = fake.calls.find((c) => c.name === 'needle_transcribe')
    expect(call.args[2]).toBe('de')
    expect(call.args[3]).toBe('Acme')
  })

  it('throws for a language outside the seven', async () => {
    const speech = createProvider()
    await expect(speech.transcribe!({ audio: silenceWav(1), language: 'pt' })).rejects.toThrow(
      /not 'pt'/,
    )
  })

  it('returns empty text with no language for silence', async () => {
    fake.jsonFor = () => JSON.stringify({ text: '', language: '', ttft_ms: 0, decode_tps: 0 })
    const speech = createProvider()
    const result = await speech.transcribe!({ audio: silenceWav(1) })
    expect(result.text).toBe('')
    expect(result.language).toBeUndefined()
    expect(result.segments).toBeUndefined()
  })

  it('splits audio longer than 30 s into windows with corrected word times', async () => {
    let window = 0
    fake.jsonFor = () => {
      window += 1
      return JSON.stringify({
        text: `chunk ${window}`,
        language: 'en',
        ttft_ms: 1,
        decode_tps: 1,
        words: [{ word: `chunk${window}`, start: 0, end: 1, probability: 1 }],
      })
    }
    const speech = createProvider()
    const result = await speech.transcribe!({ audio: silenceWav(61) })
    expect(result.text).toBe('chunk 1 chunk 2 chunk 3')
    const calls = fake.calls.filter((c) => c.name === 'needle_transcribe')
    expect(calls).toHaveLength(3)
    expect(calls.map((c) => c.args[1])).toEqual([480000, 480000, 16000])
    expect(result.segments.map((s) => s.start)).toEqual([0, 30, 60])
    expect(result.words.map((w) => w.start)).toEqual([0, 30, 60])
  })

  it('throws WhistleWavError for non-WAV audio instead of passing it through', async () => {
    const speech = createProvider()
    await expect(speech.transcribe!({ audio: new Uint8Array([1, 2, 3]) })).rejects.toThrow(
      /not a RIFF\/WAVE/,
    )
  })

  it('streams committed words as deltas and the tail as partials', async () => {
    fake.jsonFor = (name, call) => {
      if (name !== 'needle_stream_transcribe_process') {
        return JSON.stringify({
          text: '',
          words: [],
          pending: '',
          language: 'en',
          received: 3,
          pass_ms: 1,
        })
      }
      if (call === 1) {
        return JSON.stringify({
          text: '',
          words: [],
          pending: 'Hello',
          language: 'en',
          received: 1,
          pass_ms: 1,
        })
      }
      return JSON.stringify({
        text: 'Hello world',
        words: [],
        pending: 'this is',
        language: 'en',
        received: 2,
        pass_ms: 1,
      })
    }
    const speech = createProvider()
    const pcm = new Uint8Array(2 * WHISTLE_SAMPLE_RATE * 2) // 2 s of PCM16
    const events: TranscriptionStreamEvent[] = []
    for await (const event of speech.transcribeStream!(chunksOf(pcm, 16000))) {
      events.push(event)
    }
    expect(events).toEqual([
      { type: 'partial', text: 'Hello' },
      { type: 'delta', text: 'Hello world' },
      { type: 'partial', text: 'this is' },
      { type: 'final', text: 'Hello world' },
    ])
    expect(fake.calls.filter((c) => c.name === 'needle_stream_transcribe_stop')).toHaveLength(1)
  })

  it('dedupes repeated identical partials', async () => {
    fake.jsonFor = (name) => {
      if (name !== 'needle_stream_transcribe_process') {
        return JSON.stringify({
          text: '',
          words: [],
          pending: '',
          language: 'en',
          received: 3,
          pass_ms: 1,
        })
      }
      return JSON.stringify({
        text: '',
        words: [],
        pending: 'Hello',
        language: 'en',
        received: 1,
        pass_ms: 1,
      })
    }
    const speech = createProvider()
    const pcm = new Uint8Array(2 * WHISTLE_SAMPLE_RATE * 2)
    const events: TranscriptionStreamEvent[] = []
    for await (const event of speech.transcribeStream!(chunksOf(pcm, 16000))) {
      events.push(event)
    }
    expect(events.filter((e) => e.type === 'partial')).toHaveLength(1)
  })

  it('resamples streamed PCM16 from 8 kHz to 16 kHz blocks', async () => {
    const speech = createProvider()
    const pcm = new Uint8Array(8000 * 2) // 1 s of 8 kHz PCM16 = 8000 samples
    for await (const _event of speech.transcribeStream!(chunksOf(pcm, 4000), {
      sampleRate: 8000,
    })) {
      void _event
    }
    const processes = fake.calls.filter((c) => c.name === 'needle_stream_transcribe_process')
    expect(processes).toHaveLength(1)
    // 8000 inputs yield 15999 outputs: the 16000th needs one more input sample
    // as interpolation lookahead — the flush tail carries the difference.
    expect(processes[0].args[1]).toBe(15999)
  })

  it('rejects a non-finite or non-positive stream sampleRate instead of hanging the resampler', async () => {
    // A 0/negative/NaN rate makes FloatBlockResampler's `lastNeeded` bound
    // never advance, so its emit loop would spin forever inside the first
    // `push()` — the generator must refuse the rate up front instead.
    const speech = createProvider()
    const pcm = new Uint8Array(3200) // 0.1 s of PCM16
    for (const badRate of [0, -8000, Number.NaN]) {
      await expect(
        speech.transcribeStream!(chunksOf(pcm, 1600), { sampleRate: badRate }).next(),
      ).rejects.toThrow(/sampleRate/)
    }
    // Nothing reached the engine: the refusal happens before any work.
    expect(fake.calls.filter((c) => c.name === 'needle_stream_transcribe_process')).toHaveLength(0)
  })

  it('reassembles a PCM16 sample split across chunks instead of crashing the stream', async () => {
    // A transport frame boundary at an odd byte offset splits one PCM16
    // sample's two bytes across chunks; Int16Array refuses an odd byte count,
    // so the odd-sized stream used to die with a raw RangeError mid-stream.
    // The engine must receive the SAME blocks it would have from even chunks.
    const speech = createProvider()
    const pcm = new Uint8Array(2 * WHISTLE_SAMPLE_RATE * 2) // 2 s of PCM16
    for (let i = 0; i < pcm.length; i++) pcm[i] = (i * 7) & 0xff
    const blockSizes = (): unknown[] =>
      fake.calls.filter((c) => c.name === 'needle_stream_transcribe_process').map((c) => c.args[1])
    const drain = async (split: number): Promise<void> => {
      for await (const _event of speech.transcribeStream!(chunksOf(pcm, split))) void _event
    }
    await drain(16000) // even chunks
    const even = blockSizes()
    fake.calls = []
    await drain(3333) // odd chunks — every boundary splits a sample
    const odd = blockSizes()
    expect(even).toEqual([16000, 16000])
    expect(odd).toEqual(even)
  })

  it('fails as a typed engine error when a wasm allocation cannot fit', async () => {
    // `_malloc` returns 0 when the heap cannot fit an allocation; writing
    // anyway used to land the bytes at offset 0 — the engine's static area —
    // corrupting it silently. Every allocation must fail as the typed error
    // for its stage instead.
    const weightsUrl = 'https://example.test/alloc-whistle.cact'
    // Load-path allocations (weights, output buffer) fail the load.
    fake.failMallocs = true
    const speech = createProvider({ weightsUrl })
    await expect(speech.transcribe!({ audio: silenceWav(1) })).rejects.toThrow(
      /wasm heap could not fit the whistle weights/,
    )
    // After the load succeeds, a failed audio allocation fails the call —
    // and the next call (allocation restored) works.
    fake.failMallocs = false
    await speech.transcribe!({ audio: silenceWav(1) })
    fake.failMallocs = true
    await expect(speech.transcribe!({ audio: silenceWav(1) })).rejects.toThrow(
      /wasm heap could not fit the audio/,
    )
    fake.failMallocs = false
  })

  it('stops the engine stream when the consumer aborts mid-way', async () => {
    fake.jsonFor = (name) => {
      if (name !== 'needle_stream_transcribe_process') {
        return JSON.stringify({
          text: '',
          words: [],
          pending: '',
          language: 'en',
          received: 3,
          pass_ms: 1,
        })
      }
      return JSON.stringify({
        text: '',
        words: [],
        pending: 'Hello',
        language: 'en',
        received: 1,
        pass_ms: 1,
      })
    }
    const controller = new AbortController()
    const speech = createProvider()
    const pcm = new Uint8Array(3 * WHISTLE_SAMPLE_RATE * 2) // 3 chunks of 1 s
    const events: TranscriptionStreamEvent[] = []
    for await (const event of speech.transcribeStream!(chunksOf(pcm, 16000 * 2), {
      signal: controller.signal,
    })) {
      events.push(event)
      controller.abort()
    }
    expect(events).toEqual([{ type: 'partial', text: 'Hello' }])
    // aborted after the first pass — the remaining chunks never reach the engine
    expect(fake.calls.filter((c) => c.name === 'needle_stream_transcribe_process')).toHaveLength(1)
    // the finally block stopped the engine's stream so the next one starts fresh
    expect(fake.calls.filter((c) => c.name === 'needle_stream_transcribe_stop')).toHaveLength(1)
  })

  it('serializes concurrent stream sessions — the engine has one stream', async () => {
    // The wasm engine keeps the live stream (rolling audio, two-pass
    // agreement) in ONE process-global state with no session handle, and every
    // provider instance shares that engine. Two concurrent transcribeStream
    // calls must therefore take turns: every block of stream B may only reach
    // the engine AFTER stream A's stop — otherwise A's and B's audio interleave
    // in one transcript and A's stop ends B's session mid-dictation.
    fake.jsonFor = (name) =>
      name === 'needle_stream_transcribe_process'
        ? JSON.stringify({
            text: '',
            words: [],
            pending: 'Hi',
            language: 'en',
            received: 1,
            pass_ms: 1,
          })
        : JSON.stringify({
            text: '',
            words: [],
            pending: '',
            language: 'en',
            received: 2,
            pass_ms: 1,
          })

    // PCM16 filled with ±16384 → first float ±0.5 — the marker the fake
    // records, attributing every engine process call to its stream.
    const pcm16Filled = (value: number): Uint8Array => {
      const out = new Uint8Array(2 * WHISTLE_SAMPLE_RATE * 2) // 2 s, two 1 s blocks
      const view = new DataView(out.buffer)
      for (let i = 0; i < out.length / 2; i++) view.setInt16(i * 2, value, true)
      return out
    }
    const pcmA = pcm16Filled(16384)
    const pcmB = pcm16Filled(-16384)

    let openGateA!: () => void
    const gateA = new Promise<void>((resolve) => {
      openGateA = resolve
    })
    // Stream A's second chunk is held back until B's first block is ready, so
    // B has every opportunity to write into the engine's stream mid-session.
    async function* gatedA(): AsyncGenerator<Uint8Array> {
      yield pcmA.subarray(0, WHISTLE_SAMPLE_RATE * 2)
      await gateA
      yield pcmA.subarray(WHISTLE_SAMPLE_RATE * 2)
    }
    async function* straightB(): AsyncGenerator<Uint8Array> {
      yield pcmB.subarray(0, WHISTLE_SAMPLE_RATE * 2)
      yield pcmB.subarray(WHISTLE_SAMPLE_RATE * 2)
    }
    const drain = async (gen: AsyncGenerator<TranscriptionStreamEvent>): Promise<void> => {
      for await (const event of gen) void event
    }

    const speechA = createProvider()
    const speechB = createProvider()
    const doneA = drain(speechA.transcribeStream!(gatedA()))
    await new Promise((resolve) => setTimeout(resolve, 20)) // A takes the session, parks on its gate
    const doneB = drain(speechB.transcribeStream!(straightB()))
    await new Promise((resolve) => setTimeout(resolve, 20)) // B's first block is ready
    openGateA()
    await Promise.all([doneA, doneB])

    const engineCalls = fake.calls.filter(
      (c) =>
        c.name === 'needle_stream_transcribe_process' || c.name === 'needle_stream_transcribe_stop',
    )
    const firstBWrite = engineCalls.findIndex(
      (c) => c.name === 'needle_stream_transcribe_process' && (c.marker as number) < 0,
    )
    const aStop = engineCalls.findIndex((c) => c.name === 'needle_stream_transcribe_stop')
    // Both sessions ran to completion: two blocks each, one stop each.
    expect(engineCalls.filter((c) => c.marker === 0.5)).toHaveLength(2)
    expect(engineCalls.filter((c) => c.marker === -0.5)).toHaveLength(2)
    expect(engineCalls.filter((c) => c.name === 'needle_stream_transcribe_stop')).toHaveLength(2)
    // THE point: stream B's first engine write came only after stream A ended.
    expect(firstBWrite).toBeGreaterThan(-1)
    expect(firstBWrite).toBeGreaterThan(aStop)
  })

  it('drops a session that aborts while queued for the gate — its tail block included', async () => {
    // The gate is taken LAZILY, at the first processed block — and the
    // end-of-input `flush()` takes it too, for a caller whose audio never
    // filled one block. That second await is a fresh chance for the caller to
    // abort, and it is NOT covered by the loop's post-acquire check: without
    // one, a consumer that already gave up still had its tail block written
    // into the engine's single stream (and a delta/final yielded to it) —
    // handing the session that was waiting on the gate another session's
    // audio, and reporting a transcript for a dictation the caller cancelled.
    fake.jsonFor = (name) =>
      JSON.stringify({
        text: name === 'needle_stream_transcribe_process' ? 'hi' : '',
        words: [],
        pending: '',
        language: 'en',
        received: 1,
        pass_ms: 1,
      })

    // PCM16 filled with `value` — its first float (±0.5) is the marker stored
    // on every process call, attributing the write to its session.
    const pcm16 = (samples: number, value: number): Uint8Array => {
      const out = new Uint8Array(samples * 2)
      const view = new DataView(out.buffer)
      for (let i = 0; i < samples; i++) view.setInt16(i * 2, value, true)
      return out
    }
    const drain = async (gen: AsyncGenerator<TranscriptionStreamEvent>): Promise<void> => {
      for await (const event of gen) void event
    }

    let openGateA!: () => void
    const gateA = new Promise<void>((resolve) => {
      openGateA = resolve
    })
    // A: two full 1 s blocks, so it takes the gate, then parks on its own gate.
    async function* gatedA(): AsyncGenerator<Uint8Array> {
      yield pcm16(WHISTLE_SAMPLE_RATE * 2, 16384)
      await gateA
    }
    const doneA = drain(createProvider().transcribeStream!(gatedA()))
    await vi.waitFor(() =>
      expect(fake.calls.filter((c) => c.name === 'needle_stream_transcribe_process')).toHaveLength(
        2,
      ),
    )

    // B: HALF a second — no complete block, so its entire audio IS the tail the
    // flush hands to the engine … behind A's gate.
    const controller = new AbortController()
    const bEvents: TranscriptionStreamEvent[] = []
    const doneB = (async (): Promise<void> => {
      for await (const event of createProvider().transcribeStream!(
        (async function* () {
          yield pcm16(WHISTLE_SAMPLE_RATE / 2, -16384)
        })(),
        { signal: controller.signal },
      )) {
        bEvents.push(event)
      }
    })()

    // B is parked awaiting the gate; abort it, then let A finish.
    await new Promise((resolve) => setTimeout(resolve, 20))
    controller.abort()
    openGateA()
    await Promise.all([doneA, doneB])

    // B's audio never reached the engine and its consumer saw nothing: no
    // tail write for B, no streamStop for it (it never started a session), and
    // exactly one stop — A's.
    expect(
      fake.calls.filter(
        (c) => c.name === 'needle_stream_transcribe_process' && (c.marker as number) < 0,
      ),
    ).toHaveLength(0)
    expect(fake.calls.filter((c) => c.name === 'needle_stream_transcribe_stop')).toHaveLength(1)
    expect(bEvents).toEqual([])
  })

  it('reads local weights from NEEDLE_WHISTLE_WEIGHTS instead of fetching', async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'whistle-weights-'))
    const weightsPath = join(tmpDir, 'whistle.cact')
    writeFileSync(weightsPath, WEIGHTS_BYTES)
    process.env.NEEDLE_WHISTLE_WEIGHTS = weightsPath
    const speech = createProvider()
    const result = await speech.transcribe!({ audio: silenceWav(1) })
    expect(result.text).toBe('hello world')
    expect(fake.loadCalls).toHaveLength(1)
    expect(fake.loadCalls[0][1]).toBe(WEIGHTS_BYTES.length)
    expect(fetchLog.filter((url) => url.endsWith('whistle.cact'))).toHaveLength(0)
  })

  it('honours WHISTLE_WEIGHTS_URL and pins the engine wasm next to the glue URL', async () => {
    process.env.WHISTLE_WEIGHTS_URL = 'https://mirror.example/whistle.cact'
    const speech = createProvider()
    await speech.transcribe!({ audio: silenceWav(1) })
    expect(fetchLog).toContain('https://mirror.example/whistle.cact')
    expect(fetchLog).toContain(DEFAULT_WHISTLE_ENGINE_URL)
    expect(fetchLog).toContain(
      'https://huggingface.co/Cactus-Compute/needle3/resolve/main/wasm/needle.wasm',
    )
  })

  it('rejects enginePath without wasmPath', async () => {
    const speech = createProvider({ enginePath: '/opt/needle.js' })
    await expect(speech.transcribe!({ audio: silenceWav(1) })).rejects.toThrow(/together/)
  })

  it('surfaces engine failures as WhistleEngineError and retries on the next call', async () => {
    // a dedicated source URL: the default-URL engine is already cached by
    // earlier tests, and the failure must hit a fresh load
    const weightsUrl = 'https://example.test/failing-whistle.cact'
    fake.loadResult = -1
    fake.modelsResult = 0
    const speech = createProvider({ weightsUrl })
    await expect(speech.transcribe!({ audio: silenceWav(1) })).rejects.toThrow(WhistleEngineError)
    fake.loadResult = 0
    fake.modelsResult = 2
    await expect(speech.transcribe!({ audio: silenceWav(1) })).resolves.toHaveProperty(
      'text',
      'hello world',
    )
  })

  it('fails a download that dies mid-stream as a typed download-failed error', async () => {
    // A connection reset after the headers (a dead proxy, a flaky mirror)
    // happens INSIDE the body transfer: it must surface as the same typed
    // WhistleEngineError('download-failed') every other fetch failure
    // produces, not escape as a raw TypeError no caller can classify.
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
    const speech = createProvider({ weightsUrl })
    const error = (await speech.transcribe!({ audio: silenceWav(1) }).then(
      () => null,
      (e: unknown) => e,
    )) as WhistleEngineError | null
    expect(error).toBeInstanceOf(WhistleEngineError)
    expect(error!.code).toBe('download-failed')
    expect(error!.message).toContain('mid-stream')
    expect(error!.message).toContain('connection reset mid-body')
  })

  it('surfaces a transcribe failure with the engine error text', async () => {
    fake.returnFor = (name) => (name === 'needle_transcribe' ? -1 : 1)
    const speech = createProvider()
    await expect(speech.transcribe!({ audio: silenceWav(1) })).rejects.toThrow(
      /fake engine failure/,
    )
  })

  it('loads the engine once per source and shares it across providers', async () => {
    const config = { weightsUrl: 'https://example.test/shared-whistle.cact' }
    await createProvider(config).transcribe!({ audio: silenceWav(1) })
    await createProvider(config).transcribe!({ audio: silenceWav(1) })
    expect(fake.loadCalls).toHaveLength(1)
    expect(fetchLog.filter((u) => u === config.weightsUrl)).toHaveLength(1)
  })

  it('registers its optional config as secret definitions', () => {
    expect(aiSpeechWhistleSecretDefinitions).toHaveLength(5)
    expect(aiSpeechWhistleSecretDefinitions.map((definition) => definition.key)).toEqual([
      'WHISTLE_ENGINE_URL',
      'WHISTLE_WEIGHTS_URL',
      'NEEDLE_WHISTLE_WEIGHTS',
      'NEEDLE_ENGINE_PATH',
      'NEEDLE_WASM_PATH',
    ])
    expect(aiSpeechWhistleSecretDefinitions.every((d) => d.required === false)).toBe(true)
  })
})
