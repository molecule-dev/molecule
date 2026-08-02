import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AIVoiceProvider, VoiceTranscriptEvent } from '@molecule/app-ai-voice'

import { createProvider, provider as lazyProvider, WhisperVoiceProvider } from '../provider.js'

// --- Mock @huggingface/transformers ---

const mockAsr = vi.fn(async (_audio: Float32Array, _options?: Record<string, unknown>) => ({
  text: ' hello world ',
}))
const mockPipeline = vi.fn(async () => mockAsr)

vi.mock('@huggingface/transformers', () => ({
  get pipeline() {
    return mockPipeline
  },
}))

// --- Mock Web Audio / getUserMedia ---

interface MockProcessor {
  onaudioprocess: ((event: unknown) => void) | null
  connect: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
}

let mockProcessor: MockProcessor | null = null
let closedContexts = 0
let stoppedTracks = 0

class MockAudioContext {
  sampleRate = 16000
  destination = {}
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
  provider: WhisperVoiceProvider,
  handlers: Parameters<AIVoiceProvider['startListening']>[1],
  options?: Parameters<AIVoiceProvider['startListening']>[0],
): Promise<void> {
  provider.startListening(options, handlers)
  await vi.waitFor(() => {
    if (!mockProcessor) throw new Error('capture not started yet')
  })
}

describe('WhisperVoiceProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProcessor = null
    closedContexts = 0
    stoppedTracks = 0
    mockAsr.mockImplementation(async () => ({ text: ' hello world ' }))
    installBrowserEnv()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('createProvider returns a WhisperVoiceProvider with name "whisper"', () => {
    const provider = createProvider()
    expect(provider).toBeInstanceOf(WhisperVoiceProvider)
    expect(provider.name).toBe('whisper')
  })

  it('the lazy provider proxy defers construction and exposes the interface', () => {
    expect(lazyProvider.name).toBe('whisper')
    expect(typeof lazyProvider.startListening).toBe('function')
  })

  it('isRecognitionSupported is false without getUserMedia', () => {
    vi.unstubAllGlobals()
    vi.stubGlobal('navigator', {})
    const provider = createProvider()
    expect(provider.isRecognitionSupported()).toBe(false)
  })

  it('isRecognitionSupported is true with mic + audio + wasm available', () => {
    const provider = createProvider()
    expect(provider.isRecognitionSupported()).toBe(true)
  })

  it('reports not-supported when getUserMedia is unavailable', () => {
    vi.unstubAllGlobals()
    vi.stubGlobal('navigator', {})
    const provider = createProvider()
    const onError = vi.fn()
    provider.startListening(undefined, { onError })
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'not-supported' }))
  })

  it('reports not-allowed when the mic permission is denied', async () => {
    getUserMediaImpl = async () => {
      throw new DOMException('denied', 'NotAllowedError')
    }
    const provider = createProvider()
    const onError = vi.fn()
    provider.startListening(undefined, { onError })
    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'not-allowed' }))
    })
    expect(provider.getState()).toBe('error')
  })

  it('transcribes a speech chunk closed by silence and emits a final transcript', async () => {
    const provider = createProvider()
    const transcripts: VoiceTranscriptEvent[] = []
    await startAndWaitForCapture(provider, { onTranscript: (e) => transcripts.push(e) })

    // 3 speech frames, then enough silence (800ms = 12800 samples > 4 frames)
    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)

    await vi.waitFor(() => {
      expect(transcripts).toHaveLength(1)
    })
    expect(transcripts[0]).toEqual({ transcript: 'hello world', isFinal: true, confidence: 1 })
    provider.dispose()
  })

  it('ignores silence-only audio and sub-minimum blips', async () => {
    const provider = createProvider()
    const onTranscript = vi.fn()
    await startAndWaitForCapture(provider, { onTranscript })

    // Pure silence — never enters speech
    for (let i = 0; i < 10; i++) emitFrame(0)
    provider.stopListening()

    await new Promise((r) => setTimeout(r, 50))
    expect(onTranscript).not.toHaveBeenCalled()
    expect(mockAsr).not.toHaveBeenCalled()
    provider.dispose()
  })

  it('stopListening flushes in-progress speech so the last sentence is not lost', async () => {
    const provider = createProvider()
    const transcripts: VoiceTranscriptEvent[] = []
    await startAndWaitForCapture(provider, { onTranscript: (e) => transcripts.push(e) })

    // Speech with no closing pause, then an immediate stop
    for (let i = 0; i < 3; i++) emitFrame(0.1)
    provider.stopListening()

    await vi.waitFor(() => {
      expect(transcripts).toHaveLength(1)
    })
    expect(stoppedTracks).toBeGreaterThan(0)
    expect(closedContexts).toBeGreaterThan(0)
    provider.dispose()
  })

  it('passes the mapped language to multilingual whisper models only', async () => {
    const provider = createProvider()
    const transcripts: VoiceTranscriptEvent[] = []
    await startAndWaitForCapture(
      provider,
      { onTranscript: (e) => transcripts.push(e) },
      { language: 'fr-FR' },
    )
    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)
    await vi.waitFor(() => expect(transcripts).toHaveLength(1))
    expect(mockAsr).toHaveBeenCalledWith(
      expect.any(Float32Array),
      expect.objectContaining({ language: 'fr', task: 'transcribe' }),
    )
    provider.dispose()

    // Moonshine (English-only) must not receive a language option
    mockAsr.mockClear()
    mockProcessor = null
    const moonshine = createProvider({ model: 'onnx-community/moonshine-base-ONNX' })
    const moonshineTranscripts: VoiceTranscriptEvent[] = []
    await startAndWaitForCapture(
      moonshine,
      { onTranscript: (e) => moonshineTranscripts.push(e) },
      { language: 'fr-FR' },
    )
    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)
    await vi.waitFor(() => expect(moonshineTranscripts).toHaveLength(1))
    expect(mockAsr).toHaveBeenCalledWith(expect.any(Float32Array), {})
    moonshine.dispose()
  })

  it('reports model progress through onModelProgress', async () => {
    const events: Array<{ status: string }> = []
    const provider = createProvider({ onModelProgress: (e) => events.push(e) })
    await startAndWaitForCapture(provider, {})
    await vi.waitFor(() => {
      expect(events.map((e) => e.status)).toContain('ready')
    })
    expect(events[0].status).toBe('loading')
    provider.dispose()
  })

  it("is 'processing' during model load, then 'listening' once ready", async () => {
    const states: string[] = []
    let releaseModel: (() => void) | null = null
    mockPipeline.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseModel = () => resolve(mockAsr)
        }) as Promise<typeof mockAsr>,
    )
    const provider = createProvider()
    await startAndWaitForCapture(provider, { onStateChange: (s) => states.push(s) })
    expect(provider.getState()).toBe('processing')
    ;(releaseModel as unknown as () => void)()
    await vi.waitFor(() => {
      expect(provider.getState()).toBe('listening')
    })
    expect(states).toEqual(['processing', 'listening'])
    provider.dispose()
  })

  it('surfaces transcription failures as errors without stopping the session', async () => {
    mockAsr.mockRejectedValueOnce(new Error('boom'))
    const provider = createProvider()
    const onError = vi.fn()
    const transcripts: VoiceTranscriptEvent[] = []
    await startAndWaitForCapture(provider, {
      onError,
      onTranscript: (e) => transcripts.push(e),
    })
    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)
    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'transcription-failed' }),
      )
    })
    // A later chunk still transcribes
    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)
    await vi.waitFor(() => expect(transcripts).toHaveLength(1))
    provider.dispose()
  })

  it('dispose releases the microphone and ignores later frames', async () => {
    const provider = createProvider()
    const onTranscript = vi.fn()
    await startAndWaitForCapture(provider, { onTranscript })
    provider.dispose()
    expect(stoppedTracks).toBeGreaterThan(0)
    emitFrame(0.1)
    await new Promise((r) => setTimeout(r, 50))
    expect(onTranscript).not.toHaveBeenCalled()
  })
})
