import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, DefaultVoiceProvider } from '../provider.js'

// --- Mock SpeechRecognition ---

interface MockRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: unknown) => void) | null
  onerror: ((event: unknown) => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  abort: ReturnType<typeof vi.fn>
}

let mockRecognitionInstance: MockRecognition | null = null
let recognitionConstructorCallCount = 0

function createMockRecognition(): MockRecognition {
  recognitionConstructorCallCount++
  return {
    lang: '',
    continuous: false,
    interimResults: false,
    maxAlternatives: 1,
    onresult: null,
    onerror: null,
    onstart: null,
    onend: null,
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
  }
}

// Use a Proxy to intercept `new` calls — avoids this-aliasing and vi.fn constructor warnings
const MockSpeechRecognition = new Proxy(createMockRecognition, {
  construct(): MockRecognition {
    const instance = createMockRecognition()
    mockRecognitionInstance = instance
    return instance
  },
})

// --- Mock SpeechSynthesisUtterance ---

interface MockUtterance {
  text: string
  lang: string
  rate: number
  pitch: number
  volume: number
  voice: { name: string; voiceURI: string } | null
  onend: ((event: unknown) => void) | null
  onerror: ((event: unknown) => void) | null
}

let capturedUtterance: MockUtterance | null = null

function createMockUtterance(text: string): MockUtterance {
  return {
    text,
    lang: '',
    rate: 1,
    pitch: 1,
    volume: 1,
    voice: null,
    onend: null,
    onerror: null,
  }
}

const MockSpeechSynthesisUtterance = new Proxy(createMockUtterance, {
  construct(_target: unknown, args: [string]): MockUtterance {
    const instance = createMockUtterance(args[0])
    capturedUtterance = instance
    return instance
  },
})

// --- Mock SpeechSynthesis ---

let mockSynthesis: {
  speak: ReturnType<typeof vi.fn>
  cancel: ReturnType<typeof vi.fn>
  getVoices: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
}

function createMockSynthesis() {
  return {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => [
      {
        name: 'Google US English',
        voiceURI: 'Google US English',
        lang: 'en-US',
        default: true,
        localService: false,
      },
      {
        name: 'Alex',
        voiceURI: 'com.apple.speech.synthesis.voice.Alex',
        lang: 'en-US',
        default: false,
        localService: true,
      },
    ]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
}

beforeEach(() => {
  mockRecognitionInstance = null
  capturedUtterance = null
  recognitionConstructorCallCount = 0
  mockSynthesis = createMockSynthesis()

  const g = globalThis as Record<string, unknown>
  g.SpeechRecognition = MockSpeechRecognition
  g.speechSynthesis = mockSynthesis
  g.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance
})

afterEach(() => {
  const g = globalThis as Record<string, unknown>
  delete g.SpeechRecognition
  delete g.webkitSpeechRecognition
  delete g.speechSynthesis
  delete g.SpeechSynthesisUtterance
  vi.restoreAllMocks()
})

describe('DefaultVoiceProvider', () => {
  describe('createProvider', () => {
    it('creates a provider instance', () => {
      const provider = createProvider()
      expect(provider).toBeInstanceOf(DefaultVoiceProvider)
      expect(provider.name).toBe('default')
    })

    it('creates a provider with config', () => {
      const provider = createProvider({
        recognition: { language: 'fr-FR' },
        synthesis: { rate: 1.5 },
      })
      expect(provider).toBeInstanceOf(DefaultVoiceProvider)
    })
  })

  describe('state management', () => {
    it('starts in idle state', () => {
      const provider = createProvider()
      expect(provider.getState()).toBe('idle')
    })
  })

  describe('isSupported / isRecognitionSupported / isSynthesisSupported', () => {
    it('reports recognition supported when SpeechRecognition is available', () => {
      const provider = createProvider()
      expect(provider.isRecognitionSupported()).toBe(true)
    })

    it('reports recognition supported with webkit prefix', () => {
      delete (globalThis as Record<string, unknown>).SpeechRecognition
      ;(globalThis as Record<string, unknown>).webkitSpeechRecognition = MockSpeechRecognition
      const provider = createProvider()
      expect(provider.isRecognitionSupported()).toBe(true)
    })

    it('reports recognition unsupported when API is missing', () => {
      delete (globalThis as Record<string, unknown>).SpeechRecognition
      const provider = createProvider()
      expect(provider.isRecognitionSupported()).toBe(false)
    })

    it('reports synthesis supported when speechSynthesis is available', () => {
      const provider = createProvider()
      expect(provider.isSynthesisSupported()).toBe(true)
    })

    it('reports synthesis unsupported when API is missing', () => {
      ;(globalThis as Record<string, unknown>).speechSynthesis = undefined
      const provider = createProvider()
      expect(provider.isSynthesisSupported()).toBe(false)
    })

    it('isSupported returns true when either API is available', () => {
      const provider = createProvider()
      expect(provider.isSupported()).toBe(true)
    })

    it('isSupported returns false when neither API is available', () => {
      ;(globalThis as Record<string, unknown>).SpeechRecognition = undefined
      ;(globalThis as Record<string, unknown>).speechSynthesis = undefined
      const provider = createProvider()
      expect(provider.isSupported()).toBe(false)
    })
  })

  describe('startListening', () => {
    it('creates a SpeechRecognition instance with default options', () => {
      const provider = createProvider()
      provider.startListening()

      expect(recognitionConstructorCallCount).toBeGreaterThan(0)
      expect(mockRecognitionInstance!.lang).toBe('en-US')
      expect(mockRecognitionInstance!.continuous).toBe(false)
      expect(mockRecognitionInstance!.interimResults).toBe(true)
      expect(mockRecognitionInstance!.maxAlternatives).toBe(1)
      expect(mockRecognitionInstance!.start).toHaveBeenCalled()

      provider.dispose()
    })

    it('applies custom recognition options', () => {
      const provider = createProvider()
      provider.startListening({
        language: 'ja-JP',
        continuous: true,
        interimResults: false,
        maxAlternatives: 3,
      })

      expect(mockRecognitionInstance!.lang).toBe('ja-JP')
      expect(mockRecognitionInstance!.continuous).toBe(true)
      expect(mockRecognitionInstance!.interimResults).toBe(false)
      expect(mockRecognitionInstance!.maxAlternatives).toBe(3)

      provider.dispose()
    })

    it('merges config defaults with per-call options', () => {
      const provider = createProvider({
        recognition: { language: 'de-DE', continuous: true },
      })
      provider.startListening({ interimResults: false })

      expect(mockRecognitionInstance!.lang).toBe('de-DE')
      expect(mockRecognitionInstance!.continuous).toBe(true)
      expect(mockRecognitionInstance!.interimResults).toBe(false)

      provider.dispose()
    })

    it('transitions to listening state on start', () => {
      const provider = createProvider()
      const onStateChange = vi.fn()
      provider.startListening({}, { onStateChange })

      mockRecognitionInstance!.onstart!()

      expect(provider.getState()).toBe('listening')
      expect(onStateChange).toHaveBeenCalledWith('listening')

      provider.dispose()
    })

    it('reports transcript events', () => {
      const provider = createProvider()
      const onTranscript = vi.fn()
      provider.startListening({}, { onTranscript })

      mockRecognitionInstance!.onresult!({
        results: [
          {
            0: { transcript: 'hello world', confidence: 0.95 },
            isFinal: true,
            length: 1,
          },
        ],
      })

      expect(onTranscript).toHaveBeenCalledWith({
        transcript: 'hello world',
        isFinal: true,
        confidence: 0.95,
      })

      provider.dispose()
    })

    it('reports interim transcript events', () => {
      const provider = createProvider()
      const onTranscript = vi.fn()
      provider.startListening({ interimResults: true }, { onTranscript })

      mockRecognitionInstance!.onresult!({
        results: [
          {
            0: { transcript: 'hel', confidence: 0.6 },
            isFinal: false,
            length: 1,
          },
        ],
      })

      expect(onTranscript).toHaveBeenCalledWith({
        transcript: 'hel',
        isFinal: false,
        confidence: 0.6,
      })

      provider.dispose()
    })

    it('reports errors from recognition', () => {
      const provider = createProvider()
      const onError = vi.fn()
      const onStateChange = vi.fn()
      provider.startListening({}, { onError, onStateChange })

      mockRecognitionInstance!.onerror!({ error: 'not-allowed', message: 'Permission denied' })

      expect(onError).toHaveBeenCalledWith({
        code: 'not-allowed',
        message: 'Permission denied',
      })
      expect(provider.getState()).toBe('error')

      provider.dispose()
    })

    it('ignores aborted errors (from intentional stop)', () => {
      const provider = createProvider()
      const onError = vi.fn()
      provider.startListening({}, { onError })

      mockRecognitionInstance!.onerror!({ error: 'aborted', message: '' })

      expect(onError).not.toHaveBeenCalled()

      provider.dispose()
    })

    it('transitions to idle when recognition ends', () => {
      const provider = createProvider()
      const onStateChange = vi.fn()
      provider.startListening({}, { onStateChange })

      mockRecognitionInstance!.onstart!()
      onStateChange.mockClear()

      mockRecognitionInstance!.onend!()

      expect(provider.getState()).toBe('idle')

      provider.dispose()
    })

    it('calls onError when recognition is not supported', () => {
      delete (globalThis as Record<string, unknown>).SpeechRecognition
      const provider = createProvider()
      const onError = vi.fn()
      provider.startListening({}, { onError })

      expect(onError).toHaveBeenCalledWith({
        code: 'not-supported',
        message: 'Speech recognition is not supported in this browser',
      })
    })

    it('stops previous recognition before starting new one', () => {
      const provider = createProvider()
      provider.startListening()

      const firstInstance = mockRecognitionInstance!
      provider.startListening()

      expect(firstInstance.abort).toHaveBeenCalled()

      provider.dispose()
    })

    it('does nothing after dispose', () => {
      const provider = createProvider()
      provider.dispose()

      const countBefore = recognitionConstructorCallCount
      provider.startListening()

      expect(recognitionConstructorCallCount).toBe(countBefore)
    })
  })

  describe('stopListening', () => {
    it('aborts recognition and transitions to idle', () => {
      const provider = createProvider()
      provider.startListening()

      mockRecognitionInstance!.onstart!()
      expect(provider.getState()).toBe('listening')

      provider.stopListening()
      expect(provider.getState()).toBe('idle')
    })

    it('handles being called when not listening', () => {
      const provider = createProvider()
      expect(() => provider.stopListening()).not.toThrow()
    })
  })

  describe('speak', () => {
    it('creates an utterance with default options', async () => {
      const provider = createProvider()

      const speakPromise = provider.speak('Hello')

      expect(mockSynthesis.cancel).toHaveBeenCalled()
      expect(mockSynthesis.speak).toHaveBeenCalled()
      expect(capturedUtterance!.text).toBe('Hello')
      expect(capturedUtterance!.lang).toBe('en-US')
      expect(capturedUtterance!.rate).toBe(1)
      expect(capturedUtterance!.pitch).toBe(1)
      expect(capturedUtterance!.volume).toBe(1)
      expect(provider.getState()).toBe('speaking')

      // Simulate speech end
      capturedUtterance!.onend!({})
      await speakPromise

      expect(provider.getState()).toBe('idle')

      provider.dispose()
    })

    it('applies custom synthesis options', async () => {
      const provider = createProvider()

      const speakPromise = provider.speak('Bonjour', {
        language: 'fr-FR',
        rate: 0.8,
        pitch: 1.2,
        volume: 0.5,
      })

      expect(capturedUtterance!.lang).toBe('fr-FR')
      expect(capturedUtterance!.rate).toBe(0.8)
      expect(capturedUtterance!.pitch).toBe(1.2)
      expect(capturedUtterance!.volume).toBe(0.5)

      capturedUtterance!.onend!({})
      await speakPromise

      provider.dispose()
    })

    it('merges config defaults with per-call options', async () => {
      const provider = createProvider({
        synthesis: { language: 'es-ES', rate: 1.5 },
      })

      const speakPromise = provider.speak('Hola', { pitch: 0.9 })

      expect(capturedUtterance!.lang).toBe('es-ES')
      expect(capturedUtterance!.rate).toBe(1.5)
      expect(capturedUtterance!.pitch).toBe(0.9)

      capturedUtterance!.onend!({})
      await speakPromise

      provider.dispose()
    })

    it('selects voice by name', async () => {
      const provider = createProvider()

      const speakPromise = provider.speak('Hi', { voice: 'Alex' })

      expect(capturedUtterance!.voice?.name).toBe('Alex')

      capturedUtterance!.onend!({})
      await speakPromise

      provider.dispose()
    })

    it('calls onSpeakEnd handler when done', async () => {
      const provider = createProvider()
      const onSpeakEnd = vi.fn()

      // Set handlers via startListening
      provider.startListening({}, { onSpeakEnd })
      provider.stopListening()

      const speakPromise = provider.speak('Test')
      capturedUtterance!.onend!({})
      await speakPromise

      expect(onSpeakEnd).toHaveBeenCalled()

      provider.dispose()
    })

    it('rejects on synthesis error', async () => {
      const provider = createProvider()
      const onError = vi.fn()

      // Set handlers via startListening
      provider.startListening({}, { onError })
      provider.stopListening()

      const speakPromise = provider.speak('Test')

      capturedUtterance!.onerror!({ error: 'synthesis-failed' })

      await expect(speakPromise).rejects.toThrow('Speech synthesis error: synthesis-failed')
      expect(provider.getState()).toBe('error')

      provider.dispose()
    })

    it('resolves on cancel (not an error)', async () => {
      const provider = createProvider()

      const speakPromise = provider.speak('Test')

      capturedUtterance!.onerror!({ error: 'canceled' })

      await expect(speakPromise).resolves.toBeUndefined()

      provider.dispose()
    })

    it('throws when synthesis is not supported', async () => {
      delete (globalThis as Record<string, unknown>).speechSynthesis
      const provider = createProvider()

      await expect(provider.speak('Hello')).rejects.toThrow(
        'Speech synthesis is not supported in this browser',
      )
    })

    it('does nothing after dispose', async () => {
      const provider = createProvider()
      provider.dispose()
      // Should return without throwing
      await provider.speak('Hello')
      expect(mockSynthesis.speak).not.toHaveBeenCalled()
    })
  })

  describe('stopSpeaking', () => {
    it('cancels synthesis and transitions to idle', () => {
      const provider = createProvider()
      // Start speaking
      provider.speak('long text').catch(() => {})
      expect(provider.getState()).toBe('speaking')

      provider.stopSpeaking()
      expect(mockSynthesis.cancel).toHaveBeenCalled()
      expect(provider.getState()).toBe('idle')

      provider.dispose()
    })

    it('handles being called when not speaking', () => {
      const provider = createProvider()
      expect(() => provider.stopSpeaking()).not.toThrow()
    })
  })

  describe('getAvailableVoices', () => {
    it('returns mapped voice descriptors', async () => {
      const provider = createProvider()
      const voices = await provider.getAvailableVoices()

      expect(voices).toEqual([
        {
          id: 'Google US English',
          name: 'Google US English',
          language: 'en-US',
          isDefault: true,
          isLocal: false,
        },
        {
          id: 'com.apple.speech.synthesis.voice.Alex',
          name: 'Alex',
          language: 'en-US',
          isDefault: false,
          isLocal: true,
        },
      ])
    })

    it('waits for voiceschanged event when voices are initially empty', async () => {
      mockSynthesis.getVoices.mockReturnValueOnce([]).mockReturnValue([
        {
          name: 'Delayed Voice',
          voiceURI: 'delayed',
          lang: 'en-GB',
          default: true,
          localService: true,
        },
      ])

      mockSynthesis.addEventListener.mockImplementation((_event: string, cb: () => void) => {
        setTimeout(cb, 10)
      })

      const provider = createProvider()
      const voices = await provider.getAvailableVoices()

      expect(voices).toHaveLength(1)
      expect(voices[0].name).toBe('Delayed Voice')
    })

    it('returns empty array when synthesis is not supported', async () => {
      delete (globalThis as Record<string, unknown>).speechSynthesis
      const provider = createProvider()
      const voices = await provider.getAvailableVoices()
      expect(voices).toEqual([])
    })
  })

  describe('dispose', () => {
    it('stops listening and speaking', () => {
      const provider = createProvider()
      provider.startListening()
      provider.speak('Test').catch(() => {})

      provider.dispose()

      expect(mockSynthesis.cancel).toHaveBeenCalled()
    })

    it('prevents further operations', () => {
      const provider = createProvider()
      provider.dispose()

      const countBefore = recognitionConstructorCallCount
      provider.startListening()
      expect(recognitionConstructorCallCount).toBe(countBefore)
    })
  })

  describe('auto-restart in continuous mode', () => {
    it('restarts recognition when it ends in continuous mode', () => {
      const provider = createProvider({ autoRestart: true })
      provider.startListening({ continuous: true })

      mockRecognitionInstance!.onstart!()
      expect(provider.getState()).toBe('listening')

      const startFn = mockRecognitionInstance!.start

      // Simulate recognition ending (e.g. silence timeout)
      mockRecognitionInstance!.onend!()

      // Should have called start again (initial + restart)
      expect(startFn).toHaveBeenCalledTimes(2)
      expect(provider.getState()).toBe('listening')

      provider.dispose()
    })

    it('does not restart when autoRestart is false', () => {
      const provider = createProvider({ autoRestart: false })
      provider.startListening({ continuous: true })

      mockRecognitionInstance!.onstart!()
      const startFn = mockRecognitionInstance!.start

      mockRecognitionInstance!.onend!()

      expect(startFn).toHaveBeenCalledTimes(1)
      expect(provider.getState()).toBe('idle')

      provider.dispose()
    })

    it('does not restart in non-continuous mode', () => {
      const provider = createProvider()
      provider.startListening({ continuous: false })

      mockRecognitionInstance!.onstart!()
      const startFn = mockRecognitionInstance!.start

      mockRecognitionInstance!.onend!()

      expect(startFn).toHaveBeenCalledTimes(1)

      provider.dispose()
    })
  })
})
