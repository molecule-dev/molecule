/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProvider, setProvider } from '@molecule/app-ai-voice'

import { createProvider, supportsRecognitionLanguage } from '../index.js'

// The outside world: the parakeet.js model (network download + ONNX inference),
// the microphone, and Web Audio — mocked the same way provider.test.ts does.
const mockTranscribe = vi.fn(async () => ({
  utterance_text: ' book a table for two ',
  confidence_scores: { token_avg: 0.95 },
}))
vi.mock('parakeet.js', () => ({
  fromHub: vi.fn(async () => ({ transcribe: mockTranscribe })),
}))
vi.mock('parakeet.js/models', () => ({
  supportsLanguage: (_model: string, lang: string) => lang === 'en',
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

  it('bonds Parakeet for a covered language and emits a final transcript per pause', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: async () => ({ getTracks: () => [{ stop: () => undefined }] }),
      },
    })
    vi.stubGlobal('AudioContext', FakeAudioContext)

    const progress: string[] = []
    const language = 'en-US'
    expect(await supportsRecognitionLanguage('hi-IN')).toBe(false)
    if (await supportsRecognitionLanguage(language)) {
      setProvider(
        createProvider({
          onModelProgress: ({ status }) => progress.push(status),
        }),
      )
    }

    const voice = requireProvider()
    expect(voice.name).toBe('parakeet')
    const states: string[] = []
    const transcripts: string[] = []
    const onError = vi.fn()
    voice.startListening(
      { language },
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

    for (let i = 0; i < 3; i++) emitFrame(0.1)
    for (let i = 0; i < 4; i++) emitFrame(0)
    await vi.waitFor(() => {
      expect(transcripts).toEqual(['book a table for two'])
    })

    voice.stopListening()
    expect(voice.getState()).toBe('idle')
    expect(onError).not.toHaveBeenCalled()
  })
})
