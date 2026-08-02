import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AIVoiceProvider, VoiceTranscriptEvent } from '@molecule/app-ai-voice'

import {
  createProvider,
  ParakeetVoiceProvider,
  provider as lazyProvider,
  supportsRecognitionLanguage,
} from '../provider.js'

// --- Mock parakeet.js ---

const mockTranscribe = vi.fn(
  async (_audio: Float32Array, _sampleRate?: number, _opts?: Record<string, unknown>) => ({
    utterance_text: ' hello world ',
    confidence_scores: { token_avg: 0.93 },
  }),
)
const mockFromHub = vi.fn(async (_model: string, _options?: Record<string, unknown>) => ({
  transcribe: mockTranscribe,
}))
const mockSupportsLanguage = vi.fn((_model: string, lang: string) => lang === 'en' || lang === 'fr')

vi.mock('parakeet.js', () => ({
  get fromHub() {
    return mockFromHub
  },
  get supportsLanguage() {
    return mockSupportsLanguage
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
  provider: ParakeetVoiceProvider,
  handlers: Parameters<AIVoiceProvider['startListening']>[1],
): Promise<void> {
  provider.startListening(undefined, handlers)
  await vi.waitFor(() => {
    if (!mockProcessor) throw new Error('capture not started yet')
  })
}

describe('ParakeetVoiceProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProcessor = null
    closedContexts = 0
    stoppedTracks = 0
    mockTranscribe.mockImplementation(async () => ({
      utterance_text: ' hello world ',
      confidence_scores: { token_avg: 0.93 },
    }))
    mockFromHub.mockImplementation(async () => ({ transcribe: mockTranscribe }))
    installBrowserEnv()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('createProvider returns a ParakeetVoiceProvider with name "parakeet"', () => {
    const provider = createProvider()
    expect(provider).toBeInstanceOf(ParakeetVoiceProvider)
    expect(provider.name).toBe('parakeet')
  })

  it('the lazy provider proxy defers construction and exposes the interface', () => {
    expect(lazyProvider.name).toBe('parakeet')
    expect(typeof lazyProvider.startListening).toBe('function')
  })

  it('supportsRecognitionLanguage maps BCP-47 tags to bare codes', async () => {
    await expect(supportsRecognitionLanguage('en-US')).resolves.toBe(true)
    await expect(supportsRecognitionLanguage('fr')).resolves.toBe(true)
    await expect(supportsRecognitionLanguage('hi-IN')).resolves.toBe(false)
    expect(mockSupportsLanguage).toHaveBeenCalledWith('parakeet-tdt-0.6b-v3', 'en')
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

    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)

    await vi.waitFor(() => {
      expect(transcripts).toHaveLength(1)
    })
    expect(transcripts[0]).toEqual({ transcript: 'hello world', isFinal: true, confidence: 0.93 })
    provider.dispose()
  })

  it("is 'processing' during model load, then 'listening' once ready", async () => {
    const states: string[] = []
    let releaseModel: (() => void) | null = null
    mockFromHub.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseModel = () => resolve({ transcribe: mockTranscribe })
        }) as Promise<{ transcribe: typeof mockTranscribe }>,
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

  it('stopListening flushes in-progress speech so the last sentence is not lost', async () => {
    const provider = createProvider()
    const transcripts: VoiceTranscriptEvent[] = []
    await startAndWaitForCapture(provider, { onTranscript: (e) => transcripts.push(e) })

    for (let i = 0; i < 3; i++) emitFrame(0.1)
    provider.stopListening()

    await vi.waitFor(() => {
      expect(transcripts).toHaveLength(1)
    })
    expect(stoppedTracks).toBeGreaterThan(0)
    expect(closedContexts).toBeGreaterThan(0)
    provider.dispose()
  })

  it('reports model progress through onModelProgress', async () => {
    const events: Array<{ status: string; progress?: number }> = []
    mockFromHub.mockImplementationOnce(async (_model, options) => {
      const progress = (options as { progress: (p: unknown) => void }).progress
      progress({ loaded: 50, total: 100, file: 'encoder.onnx' })
      return { transcribe: mockTranscribe }
    })
    const provider = createProvider({ onModelProgress: (e) => events.push(e) })
    await startAndWaitForCapture(provider, {})
    await vi.waitFor(() => {
      expect(events.map((e) => e.status)).toContain('ready')
    })
    expect(events[0].status).toBe('loading')
    const downloading = events.find((e) => e.status === 'downloading')
    expect(downloading?.progress).toBe(50)
    provider.dispose()
  })

  it('surfaces transcription failures as errors without stopping the session', async () => {
    mockTranscribe.mockRejectedValueOnce(new Error('boom'))
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
