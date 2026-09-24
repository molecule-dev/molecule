/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProvider, setProvider } from '@molecule/app-ai-voice'

import { createProvider } from '../index.js'

// The outside world: transformers.js (model download + ONNX inference), the
// microphone, and Web Audio — mocked the same way provider.test.ts does.
const mockAsr = vi.fn(async (_audio: Float32Array, _options?: Record<string, unknown>) => ({
  text: ' une table pour deux ',
}))
const mockPipeline = vi.fn(async (_task: string, _model: string, _options?: unknown) => mockAsr)
const mockEnv = { backends: { onnx: { wasm: {} as { wasmPaths?: string; proxy?: boolean } } } }
vi.mock('@huggingface/transformers', () => ({
  get pipeline() {
    return mockPipeline
  },
  get env() {
    return mockEnv
  },
}))

let processor: { onaudioprocess: ((event: unknown) => void) | null } | null = null

class FakeAudioContext {
  sampleRate = 16000
  destination = {}
  createMediaStreamSource(): { connect: () => void; disconnect: () => void } {
    return { connect: () => undefined, disconnect: () => undefined }
  }
  createScriptProcessor(): {
    onaudioprocess: ((event: unknown) => void) | null
    connect: () => void
    disconnect: () => void
  } {
    const node = { onaudioprocess: null, connect: () => undefined, disconnect: () => undefined }
    processor = node
    return node
  }
  async close(): Promise<void> {}
}

/**
 * Feeds one ~256 ms audio frame into the capture graph.
 *
 * @param amplitude - Constant sample value (0 = silence).
 */
function emitFrame(amplitude: number): void {
  const frame = new Float32Array(4096).fill(amplitude)
  processor?.onaudioprocess?.({ inputBuffer: { getChannelData: () => frame } })
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bonds Whisper and emits a final transcript per pause in the requested language', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: async () => ({ getTracks: () => [{ stop: () => undefined }] }),
      },
    })
    vi.stubGlobal('AudioContext', FakeAudioContext)

    const progress: string[] = []
    setProvider(
      createProvider({
        model: 'onnx-community/whisper-base',
        wasmPaths: '/transformers-ort/',
        onModelProgress: ({ status }) => progress.push(status),
      }),
    )

    const voice = requireProvider()
    expect(voice.name).toBe('whisper')
    const states: string[] = []
    const transcripts: string[] = []
    const onError = vi.fn()
    voice.startListening(
      { language: 'fr-FR' },
      {
        onStateChange: (state) => states.push(state),
        onTranscript: ({ transcript }) => transcripts.push(transcript),
        onError,
      },
    )

    await vi.waitFor(() => {
      expect(voice.getState()).toBe('listening')
    })
    expect(states).toEqual(['processing', 'listening'])
    expect(progress).toEqual(['loading', 'ready'])
    expect(mockEnv.backends.onnx.wasm.wasmPaths).toBe('/transformers-ort/')
    expect(mockPipeline.mock.calls[0]?.[1]).toBe('onnx-community/whisper-base')

    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)
    await vi.waitFor(() => {
      expect(transcripts).toEqual(['une table pour deux'])
    })
    expect(mockAsr.mock.calls[0]?.[1]).toEqual({ language: 'fr', task: 'transcribe' })

    voice.stopListening()
    expect(voice.getState()).toBe('idle')
    expect(onError).not.toHaveBeenCalled()
  })
})
