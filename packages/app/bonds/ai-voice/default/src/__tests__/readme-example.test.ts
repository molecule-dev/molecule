/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { requireProvider, setProvider } from '@molecule/app-ai-voice'

import { createProvider } from '../index.js'

/** Minimal stand-in for the browser `SpeechRecognition` (the outside world). */
class FakeRecognition {
  static last: FakeRecognition | null = null
  lang = ''
  continuous = false
  interimResults = false
  maxAlternatives = 1
  onresult: ((event: unknown) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn(() => {
    this.onstart?.()
  })
  abort = vi.fn()
  stop = vi.fn()
  constructor() {
    FakeRecognition.last = this
  }
}

/** Minimal stand-in for `SpeechSynthesisUtterance`. */
class FakeUtterance {
  lang = ''
  rate = 1
  pitch = 1
  volume = 1
  onend: (() => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  constructor(public text: string) {}
}

describe('README @example', () => {
  const synth = {
    cancel: vi.fn(),
    getVoices: vi.fn(() => []),
    speak: vi.fn((utterance: FakeUtterance) => {
      utterance.onend?.()
    }),
  }

  beforeEach(() => {
    vi.stubGlobal('SpeechRecognition', FakeRecognition)
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    vi.stubGlobal('speechSynthesis', synth)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bonds the Web Speech provider, transcribes, and speaks', async () => {
    setProvider(
      createProvider({
        recognition: { language: 'en-US', interimResults: true },
        synthesis: { rate: 1 },
      }),
    )

    const voice = requireProvider()
    let heard = ''
    const onError = vi.fn()
    expect(voice.isRecognitionSupported()).toBe(true)
    voice.startListening(
      { continuous: false },
      {
        onTranscript: ({ transcript, isFinal }) => {
          if (isFinal) heard = transcript
        },
        onError,
      },
    )

    const recognition = FakeRecognition.last
    expect(recognition?.lang).toBe('en-US')
    expect(recognition?.interimResults).toBe(true)
    expect(voice.getState()).toBe('listening')

    const result = (transcript: string, isFinal: boolean): unknown => {
      const entry = Object.assign([{ transcript, confidence: 0.9 }], { isFinal })
      return { results: [entry] }
    }
    recognition?.onresult?.(result('book a', false))
    expect(heard).toBe('')
    recognition?.onresult?.(result('book a table for two', true))
    expect(heard).toBe('book a table for two')

    expect(voice.isSynthesisSupported()).toBe(true)
    await voice.speak('Your table is booked.')
    const spoken = synth.speak.mock.calls[0]?.[0]
    expect(spoken?.text).toBe('Your table is booked.')
    expect(spoken?.rate).toBe(1)

    voice.stopListening()
    expect(voice.getState()).toBe('idle')
    expect(onError).not.toHaveBeenCalled()
  })
})
