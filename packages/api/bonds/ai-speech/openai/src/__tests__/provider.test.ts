import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()

/** Creates a successful TTS response (binary audio). */
function mockTTSResponse(audioBytes: number[]): Record<string, unknown> {
  const buffer = new Uint8Array(audioBytes).buffer
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'audio/mpeg' }),
    arrayBuffer: vi.fn().mockResolvedValue(buffer),
  }
}

/** Creates a successful transcription/translation JSON response. */
function mockTranscriptionResponse(data: {
  text: string
  language?: string
  duration?: number
  segments?: Array<{ id: number; start: number; end: number; text: string }>
  words?: Array<{ word: string; start: number; end: number }>
}): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: vi.fn().mockResolvedValue(data),
  }
}

/** Creates a plain-text transcription response (for text/srt/vtt formats). */
function mockTextResponse(text: string): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'text/plain' }),
    text: vi.fn().mockResolvedValue(text),
  }
}

/** Creates a mock error response. */
function mockErrorResponse(status: number, body: string): Record<string, unknown> {
  return {
    ok: false,
    status,
    statusText: `Status ${status}`,
    text: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  }
}

/** Sample audio buffer for tests. */
const sampleAudio = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00])

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OpenaiSpeechProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const provider = createProvider({ apiKey: 'test-key', baseUrl: 'https://test.api' })

  // =========================================================================
  // synthesize() — TTS
  // =========================================================================

  describe('synthesize()', () => {
    it('converts text to speech with default settings', async () => {
      mockFetch.mockResolvedValue(mockTTSResponse([0xff, 0xfb, 0x90, 0x00]))

      const result = await provider.synthesize({ input: 'Hello world' })

      expect(result.audio).toBeInstanceOf(Uint8Array)
      expect(result.audio.length).toBe(4)
      expect(result.contentType).toBe('audio/mpeg')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://test.api/v1/audio/speech')
      const body = JSON.parse(init.body as string)
      expect(body.model).toBe('tts-1')
      expect(body.voice).toBe('alloy')
      expect(body.input).toBe('Hello world')
      expect(body.response_format).toBe('mp3')
      expect(body.speed).toBe(1.0)
    })

    it('uses custom model, voice, format, and speed', async () => {
      mockFetch.mockResolvedValue(mockTTSResponse([0x00]))

      await provider.synthesize({
        input: 'Test',
        model: 'tts-1-hd',
        voice: 'nova',
        responseFormat: 'opus',
        speed: 1.5,
      })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.model).toBe('tts-1-hd')
      expect(body.voice).toBe('nova')
      expect(body.response_format).toBe('opus')
      expect(body.speed).toBe(1.5)
    })

    it('includes instructions when provided', async () => {
      mockFetch.mockResolvedValue(mockTTSResponse([0x00]))

      await provider.synthesize({
        input: 'Test',
        instructions: 'Speak in a cheerful tone',
      })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.instructions).toBe('Speak in a cheerful tone')
    })

    it('does not include instructions when not provided', async () => {
      mockFetch.mockResolvedValue(mockTTSResponse([0x00]))

      await provider.synthesize({ input: 'Test' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.instructions).toBeUndefined()
    })

    it('returns correct content type for each format', async () => {
      const formats = [
        ['mp3', 'audio/mpeg'],
        ['opus', 'audio/opus'],
        ['aac', 'audio/aac'],
        ['flac', 'audio/flac'],
        ['wav', 'audio/wav'],
        ['pcm', 'audio/pcm'],
      ] as const

      for (const [format, expectedType] of formats) {
        mockFetch.mockResolvedValue(mockTTSResponse([0x00]))
        const result = await provider.synthesize({ input: 'x', responseFormat: format })
        expect(result.contentType).toBe(expectedType)
      }
    })

    it('sends correct Authorization header', async () => {
      mockFetch.mockResolvedValue(mockTTSResponse([0x00]))

      await provider.synthesize({ input: 'Test' })

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = init.headers as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer test-key')
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('uses config defaults for model, voice, format, and speed', async () => {
      const customProvider = createProvider({
        apiKey: 'test-key',
        baseUrl: 'https://test.api',
        defaultTTSModel: 'tts-1-hd',
        defaultVoice: 'shimmer',
        defaultResponseFormat: 'wav',
        defaultSpeed: 0.75,
      })
      mockFetch.mockResolvedValue(mockTTSResponse([0x00]))

      await customProvider.synthesize({ input: 'Test' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.model).toBe('tts-1-hd')
      expect(body.voice).toBe('shimmer')
      expect(body.response_format).toBe('wav')
      expect(body.speed).toBe(0.75)
    })
  })

  // =========================================================================
  // transcribe() — STT
  // =========================================================================

  describe('transcribe()', () => {
    it('transcribes audio with default settings', async () => {
      mockFetch.mockResolvedValue(
        mockTranscriptionResponse({
          text: 'Hello world',
          language: 'en',
          duration: 2.5,
        }),
      )

      const result = await provider.transcribe({ audio: sampleAudio })

      expect(result.text).toBe('Hello world')
      expect(result.language).toBe('en')
      expect(result.duration).toBe(2.5)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://test.api/v1/audio/transcriptions')
      expect(init.method).toBe('POST')
      expect(init.body).toBeInstanceOf(FormData)
    })

    it('sends correct form fields', async () => {
      mockFetch.mockResolvedValue(mockTranscriptionResponse({ text: 'test' }))

      await provider.transcribe({
        audio: sampleAudio,
        filename: 'recording.mp3',
        model: 'gpt-4o-transcribe',
        language: 'fr',
        prompt: 'Context about the audio',
        temperature: 0.2,
      })

      const formData = (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as FormData
      expect(formData.get('model')).toBe('gpt-4o-transcribe')
      expect(formData.get('language')).toBe('fr')
      expect(formData.get('prompt')).toBe('Context about the audio')
      expect(formData.get('temperature')).toBe('0.2')
      expect(formData.get('response_format')).toBe('verbose_json')
    })

    it('includes timestamp_granularities for word timestamps', async () => {
      mockFetch.mockResolvedValue(mockTranscriptionResponse({ text: 'test' }))

      await provider.transcribe({
        audio: sampleAudio,
        timestampGranularity: 'word',
      })

      const formData = (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as FormData
      expect(formData.getAll('timestamp_granularities[]')).toEqual(['word'])
    })

    it('includes both timestamp granularities', async () => {
      mockFetch.mockResolvedValue(mockTranscriptionResponse({ text: 'test' }))

      await provider.transcribe({
        audio: sampleAudio,
        timestampGranularity: 'both',
      })

      const formData = (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as FormData
      expect(formData.getAll('timestamp_granularities[]')).toEqual(['word', 'segment'])
    })

    it('parses segments from verbose_json response', async () => {
      mockFetch.mockResolvedValue(
        mockTranscriptionResponse({
          text: 'Hello. World.',
          language: 'en',
          duration: 3.0,
          segments: [
            { id: 0, start: 0.0, end: 1.5, text: 'Hello.' },
            { id: 1, start: 1.5, end: 3.0, text: ' World.' },
          ],
        }),
      )

      const result = await provider.transcribe({ audio: sampleAudio })

      expect(result.segments).toHaveLength(2)
      expect(result.segments![0]).toEqual({ id: 0, start: 0.0, end: 1.5, text: 'Hello.' })
      expect(result.segments![1]).toEqual({ id: 1, start: 1.5, end: 3.0, text: ' World.' })
    })

    it('parses words from verbose_json response', async () => {
      mockFetch.mockResolvedValue(
        mockTranscriptionResponse({
          text: 'Hello world',
          words: [
            { word: 'Hello', start: 0.0, end: 0.5 },
            { word: 'world', start: 0.5, end: 1.0 },
          ],
        }),
      )

      const result = await provider.transcribe({ audio: sampleAudio })

      expect(result.words).toHaveLength(2)
      expect(result.words![0]).toEqual({ word: 'Hello', start: 0.0, end: 0.5 })
      expect(result.words![1]).toEqual({ word: 'world', start: 0.5, end: 1.0 })
    })

    it('handles plain text response format', async () => {
      mockFetch.mockResolvedValue(mockTextResponse('Hello world'))

      const result = await provider.transcribe({
        audio: sampleAudio,
        responseFormat: 'text',
      })

      expect(result.text).toBe('Hello world')
      expect(result.language).toBeUndefined()
      expect(result.segments).toBeUndefined()
    })

    it('handles SRT response format', async () => {
      const srt = '1\n00:00:00,000 --> 00:00:02,000\nHello world'
      mockFetch.mockResolvedValue(mockTextResponse(srt))

      const result = await provider.transcribe({
        audio: sampleAudio,
        responseFormat: 'srt',
      })

      expect(result.text).toBe(srt)
    })

    it('handles VTT response format', async () => {
      const vtt = 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHello world'
      mockFetch.mockResolvedValue(mockTextResponse(vtt))

      const result = await provider.transcribe({
        audio: sampleAudio,
        responseFormat: 'vtt',
      })

      expect(result.text).toBe(vtt)
    })

    it('uses default STT model from config', async () => {
      const customProvider = createProvider({
        apiKey: 'test-key',
        baseUrl: 'https://test.api',
        defaultSTTModel: 'gpt-4o-transcribe',
      })
      mockFetch.mockResolvedValue(mockTranscriptionResponse({ text: 'test' }))

      await customProvider.transcribe({ audio: sampleAudio })

      const formData = (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as FormData
      expect(formData.get('model')).toBe('gpt-4o-transcribe')
    })

    it('does not include optional fields when not provided', async () => {
      mockFetch.mockResolvedValue(mockTranscriptionResponse({ text: 'test' }))

      await provider.transcribe({ audio: sampleAudio })

      const formData = (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as FormData
      expect(formData.get('language')).toBeNull()
      expect(formData.get('prompt')).toBeNull()
      expect(formData.get('temperature')).toBeNull()
    })
  })

  // =========================================================================
  // translate()
  // =========================================================================

  describe('translate()', () => {
    it('translates audio to English', async () => {
      mockFetch.mockResolvedValue(
        mockTranscriptionResponse({
          text: 'Hello world',
          language: 'fr',
          duration: 3.0,
        }),
      )

      const result = await provider.translate({ audio: sampleAudio })

      expect(result.text).toBe('Hello world')
      expect(result.language).toBe('fr')
      expect(result.duration).toBe(3.0)

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://test.api/v1/audio/translations')
    })

    it('sends correct form fields', async () => {
      mockFetch.mockResolvedValue(mockTranscriptionResponse({ text: 'test' }))

      await provider.translate({
        audio: sampleAudio,
        filename: 'audio.mp3',
        model: 'whisper-1',
        prompt: 'Translation context',
        temperature: 0.3,
      })

      const formData = (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as FormData
      expect(formData.get('model')).toBe('whisper-1')
      expect(formData.get('prompt')).toBe('Translation context')
      expect(formData.get('temperature')).toBe('0.3')
    })

    it('parses segments from verbose_json response', async () => {
      mockFetch.mockResolvedValue(
        mockTranscriptionResponse({
          text: 'Hello world',
          segments: [{ id: 0, start: 0.0, end: 3.0, text: 'Hello world' }],
        }),
      )

      const result = await provider.translate({ audio: sampleAudio })

      expect(result.segments).toHaveLength(1)
      expect(result.segments![0]).toEqual({ id: 0, start: 0.0, end: 3.0, text: 'Hello world' })
    })

    it('handles plain text response format', async () => {
      mockFetch.mockResolvedValue(mockTextResponse('Hello world'))

      const result = await provider.translate({
        audio: sampleAudio,
        responseFormat: 'text',
      })

      expect(result.text).toBe('Hello world')
      expect(result.language).toBeUndefined()
    })
  })

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('throws on 401 unauthorized with API error message', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(
          401,
          JSON.stringify({ error: { message: 'Incorrect API key provided' } }),
        ),
      )

      await expect(provider.synthesize({ input: 'test' })).rejects.toThrow(
        'OpenAI Speech API error: Incorrect API key provided',
      )
    })

    it('throws on 400 bad request', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(
          400,
          JSON.stringify({ error: { message: 'Invalid input: text too long' } }),
        ),
      )

      await expect(provider.synthesize({ input: 'test' })).rejects.toThrow(
        'OpenAI Speech API error: Invalid input: text too long',
      )
    })

    it('throws with HTTP status when error body is not JSON', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(500, 'Internal Server Error'))

      await expect(provider.synthesize({ input: 'test' })).rejects.toThrow(
        'OpenAI Speech API error: Internal Server Error',
      )
    })

    it('retries on 429 rate limit', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: vi.fn().mockResolvedValue('{}'),
          headers: new Headers(),
        })
        .mockResolvedValueOnce(mockTTSResponse([0x00]))

      const promise = provider.synthesize({ input: 'test' })
      await vi.advanceTimersByTimeAsync(5000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.audio).toBeInstanceOf(Uint8Array)
    })

    it('retries on 503 service unavailable', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: vi.fn().mockResolvedValue('{}'),
          headers: new Headers(),
        })
        .mockResolvedValueOnce(mockTranscriptionResponse({ text: 'test' }))

      const promise = provider.transcribe({ audio: sampleAudio })
      await vi.advanceTimersByTimeAsync(5000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.text).toBe('test')
    })

    it('respects Retry-After header', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: vi.fn().mockResolvedValue('{}'),
          headers: new Headers({ 'retry-after': '2' }),
        })
        .mockResolvedValueOnce(mockTTSResponse([0x00]))

      const promise = provider.synthesize({ input: 'test' })
      await vi.advanceTimersByTimeAsync(3000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.audio).toBeInstanceOf(Uint8Array)
    })

    it('throws after exhausting retries', async () => {
      const makeErrorResp = (): Record<string, unknown> => ({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: vi
          .fn()
          .mockResolvedValue(JSON.stringify({ error: { message: 'Rate limit exceeded' } })),
        headers: new Headers(),
      })
      mockFetch
        .mockResolvedValueOnce(makeErrorResp())
        .mockResolvedValueOnce(makeErrorResp())
        .mockResolvedValueOnce(makeErrorResp())
        .mockResolvedValueOnce(makeErrorResp())

      const promise = provider.synthesize({ input: 'test' })
      const assertion = expect(promise).rejects.toThrow(
        'OpenAI Speech API error: Rate limit exceeded',
      )
      await vi.advanceTimersByTimeAsync(60_000)
      await assertion

      expect(mockFetch).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
    })

    it('retries transcribe on 429', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: vi.fn().mockResolvedValue('{}'),
          headers: new Headers(),
        })
        .mockResolvedValueOnce(mockTranscriptionResponse({ text: 'recovered' }))

      const promise = provider.transcribe({ audio: sampleAudio })
      await vi.advanceTimersByTimeAsync(5000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.text).toBe('recovered')
    })
  })

  // =========================================================================
  // Configuration
  // =========================================================================

  describe('configuration', () => {
    it('uses OPENAI_API_KEY env var when no key provided', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'env-key')
      const envProvider = createProvider({ baseUrl: 'https://test.api' })
      mockFetch.mockResolvedValue(mockTTSResponse([0x00]))

      await envProvider.synthesize({ input: 'test' })

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = init.headers as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer env-key')
    })

    it('has correct provider name', () => {
      expect(provider.name).toBe('openai')
    })

    it('defaults to tts-1 model for synthesis', async () => {
      mockFetch.mockResolvedValue(mockTTSResponse([0x00]))

      await provider.synthesize({ input: 'test' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.model).toBe('tts-1')
    })

    it('defaults to whisper-1 model for transcription', async () => {
      mockFetch.mockResolvedValue(mockTranscriptionResponse({ text: 'test' }))

      await provider.transcribe({ audio: sampleAudio })

      const formData = (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as FormData
      expect(formData.get('model')).toBe('whisper-1')
    })

    it('defaults to alloy voice', async () => {
      mockFetch.mockResolvedValue(mockTTSResponse([0x00]))

      await provider.synthesize({ input: 'test' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.voice).toBe('alloy')
    })
  })
})
