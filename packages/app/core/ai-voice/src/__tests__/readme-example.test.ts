/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Web Speech bond with the
 * browser speech globals stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/app-ai-voice-default'

import type { VoiceEventHandlers } from '../index.js'
import { requireProvider, setProvider } from '../index.js'

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

const result = (transcript: string, isFinal: boolean): unknown => ({
  results: [Object.assign([{ transcript, confidence: 0.9 }], { isFinal })],
})

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

  it('acts on the final transcript, flags a denied mic, and speaks', async () => {
    setProvider(createProvider())

    const voice = requireProvider()
    let order = ''
    let micDenied = false
    const handlers: VoiceEventHandlers = {
      onTranscript: ({ transcript, isFinal }) => {
        if (isFinal) order = transcript
      },
      onError: ({ code }) => {
        micDenied = code === 'not-allowed'
      },
    }
    expect(voice.isRecognitionSupported()).toBe(true)
    voice.startListening({ language: 'en-US', interimResults: true }, handlers)

    const recognition = FakeRecognition.last
    expect(recognition?.lang).toBe('en-US')
    expect(voice.getState()).toBe('listening')

    recognition?.onresult?.(result('two lat', false))
    expect(order).toBe('')
    recognition?.onresult?.(result('two lattes', true))
    expect(order).toBe('two lattes')

    recognition?.onerror?.({ error: 'not-allowed', message: '' })
    expect(micDenied).toBe(true)

    expect(voice.isSynthesisSupported()).toBe(true)
    await voice.speak('Order confirmed.')
    expect(synth.speak.mock.calls[0]?.[0]?.text).toBe('Order confirmed.')

    voice.dispose()
    expect(voice.getState()).toBe('idle')
  })
})
