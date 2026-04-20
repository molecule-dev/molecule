import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()

/** Creates a successful TTS audio response. */
function mockAudioResponse(audioBytes: number[] = [0x49, 0x44, 0x33]): Record<string, unknown> {
  const buffer = new Uint8Array(audioBytes).buffer
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    arrayBuffer: vi.fn().mockResolvedValue(buffer),
  }
}

/** Creates a successful streaming TTS response with a readable body. */
function mockStreamResponse(chunks: Uint8Array[]): Record<string, unknown> {
  let index = 0
  const reader = {
    read: vi.fn().mockImplementation(() => {
      if (index < chunks.length) {
        return Promise.resolve({ done: false, value: chunks[index++] })
      }
      return Promise.resolve({ done: true, value: undefined })
    }),
    releaseLock: vi.fn(),
  }
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    body: {
      getReader: () => reader,
    },
  }
}

/** Creates a successful voices list response. */
function mockVoicesResponse(): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue({
      voices: [
        {
          voice_id: 'voice-1',
          name: 'Rachel',
          category: 'premade',
          labels: { accent: 'american', gender: 'female' },
          preview_url: 'https://example.com/rachel.mp3',
        },
        {
          voice_id: 'voice-2',
          name: 'Clyde',
          category: 'premade',
          labels: { accent: 'american', gender: 'male' },
          preview_url: 'https://example.com/clyde.mp3',
        },
      ],
    }),
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ElevenlabsSpeechProvider', () => {
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
  // synthesize()
  // =========================================================================

  describe('synthesize()', () => {
    it('synthesizes speech from text', async () => {
      const audioBytes = [0x49, 0x44, 0x33, 0x04, 0x00]
      mockFetch.mockResolvedValue(mockAudioResponse(audioBytes))

      const result = await provider.synthesize({ text: 'Hello world', voiceId: 'voice-1' })

      expect(result.audio).toEqual(new Uint8Array(audioBytes))
      expect(result.contentType).toBe('audio/mpeg')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://test.api/v1/text-to-speech/voice-1?output_format=mp3_44100_128')
      const body = JSON.parse(init.body as string)
      expect(body.text).toBe('Hello world')
      expect(body.model_id).toBe('eleven_multilingual_v2')
      expect(body.voice_settings.stability).toBe(0.5)
      expect(body.voice_settings.similarity_boost).toBe(0.75)
    })

    it('uses default voice ID when not specified in params', async () => {
      mockFetch.mockResolvedValue(mockAudioResponse())

      await provider.synthesize({ text: 'Hello', voiceId: '' })

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toContain('/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb')
    })

    it('uses custom model when specified', async () => {
      mockFetch.mockResolvedValue(mockAudioResponse())

      await provider.synthesize({
        text: 'Hello',
        voiceId: 'voice-1',
        model: 'eleven_turbo_v2_5',
      })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.model_id).toBe('eleven_turbo_v2_5')
    })

    it('sends custom voice settings', async () => {
      mockFetch.mockResolvedValue(mockAudioResponse())

      await provider.synthesize({
        text: 'Hello',
        voiceId: 'voice-1',
        stability: 0.8,
        similarityBoost: 0.9,
        style: 0.3,
        useSpeakerBoost: true,
        speed: 1.2,
      })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.voice_settings.stability).toBe(0.8)
      expect(body.voice_settings.similarity_boost).toBe(0.9)
      expect(body.voice_settings.style).toBe(0.3)
      expect(body.voice_settings.use_speaker_boost).toBe(true)
      expect(body.voice_settings.speed).toBe(1.2)
    })

    it('sends language code for multilingual models', async () => {
      mockFetch.mockResolvedValue(mockAudioResponse())

      await provider.synthesize({
        text: 'Bonjour',
        voiceId: 'voice-1',
        languageCode: 'fr',
      })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.language_code).toBe('fr')
    })

    it('does not send language code when not specified', async () => {
      mockFetch.mockResolvedValue(mockAudioResponse())

      await provider.synthesize({ text: 'Hello', voiceId: 'voice-1' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.language_code).toBeUndefined()
    })

    it('uses custom output format', async () => {
      mockFetch.mockResolvedValue(mockAudioResponse())

      const result = await provider.synthesize({
        text: 'Hello',
        voiceId: 'voice-1',
        outputFormat: 'pcm_24000',
      })

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toContain('output_format=pcm_24000')
      expect(result.contentType).toBe('audio/pcm')
    })

    it('sends correct xi-api-key header', async () => {
      mockFetch.mockResolvedValue(mockAudioResponse())

      await provider.synthesize({ text: 'Hello', voiceId: 'voice-1' })

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = init.headers as Record<string, string>
      expect(headers['xi-api-key']).toBe('test-key')
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('URL-encodes voice IDs', async () => {
      mockFetch.mockResolvedValue(mockAudioResponse())

      await provider.synthesize({ text: 'Hello', voiceId: 'voice with spaces' })

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toContain('/v1/text-to-speech/voice%20with%20spaces')
    })
  })

  // =========================================================================
  // synthesizeStream()
  // =========================================================================

  describe('synthesizeStream()', () => {
    it('streams audio chunks', async () => {
      const chunk1 = new Uint8Array([1, 2, 3])
      const chunk2 = new Uint8Array([4, 5, 6])
      mockFetch.mockResolvedValue(mockStreamResponse([chunk1, chunk2]))

      const chunks: Uint8Array[] = []
      for await (const chunk of provider.synthesizeStream({
        text: 'Hello',
        voiceId: 'voice-1',
      })) {
        chunks.push(chunk)
      }

      expect(chunks).toHaveLength(2)
      expect(chunks[0]).toEqual(chunk1)
      expect(chunks[1]).toEqual(chunk2)
    })

    it('uses the streaming endpoint', async () => {
      mockFetch.mockResolvedValue(mockStreamResponse([new Uint8Array([1])]))

      for await (const _ of provider.synthesizeStream({
        text: 'Hello',
        voiceId: 'voice-1',
      })) {
        // consume
      }

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toContain('/v1/text-to-speech/voice-1/stream')
    })

    it('throws when response has no body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        body: null,
      })

      const iterator = provider.synthesizeStream({ text: 'Hello', voiceId: 'voice-1' })
      await expect(async () => {
        for await (const _ of iterator) {
          // consume
        }
      }).rejects.toThrow('ElevenLabs API returned no response body for streaming')
    })
  })

  // =========================================================================
  // listVoices()
  // =========================================================================

  describe('listVoices()', () => {
    it('returns mapped voice info', async () => {
      mockFetch.mockResolvedValue(mockVoicesResponse())

      const voices = await provider.listVoices()

      expect(voices).toHaveLength(2)
      expect(voices[0]).toEqual({
        voiceId: 'voice-1',
        name: 'Rachel',
        category: 'premade',
        labels: { accent: 'american', gender: 'female' },
        previewUrl: 'https://example.com/rachel.mp3',
      })
      expect(voices[1].voiceId).toBe('voice-2')
      expect(voices[1].name).toBe('Clyde')
    })

    it('uses GET method for voices endpoint', async () => {
      mockFetch.mockResolvedValue(mockVoicesResponse())

      await provider.listVoices()

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://test.api/v1/voices')
      expect(init.method).toBe('GET')
    })

    it('sends xi-api-key header', async () => {
      mockFetch.mockResolvedValue(mockVoicesResponse())

      await provider.listVoices()

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = init.headers as Record<string, string>
      expect(headers['xi-api-key']).toBe('test-key')
    })
  })

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('throws on 401 unauthorized with API error message', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(401, JSON.stringify({ detail: { message: 'Invalid API key' } })),
      )

      await expect(provider.synthesize({ text: 'test', voiceId: 'voice-1' })).rejects.toThrow(
        'ElevenLabs API error: Invalid API key',
      )
    })

    it('throws on 422 validation error', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(422, JSON.stringify({ detail: { message: 'Voice not found' } })),
      )

      await expect(provider.synthesize({ text: 'test', voiceId: 'bad-voice' })).rejects.toThrow(
        'ElevenLabs API error: Voice not found',
      )
    })

    it('throws with HTTP status when error body is not JSON', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(500, 'Internal Server Error'))

      await expect(provider.synthesize({ text: 'test', voiceId: 'voice-1' })).rejects.toThrow(
        'ElevenLabs API error: Internal Server Error',
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
        .mockResolvedValueOnce(mockAudioResponse())

      const promise = provider.synthesize({ text: 'test', voiceId: 'voice-1' })
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
        .mockResolvedValueOnce(mockAudioResponse())

      const promise = provider.synthesize({ text: 'test', voiceId: 'voice-1' })
      await vi.advanceTimersByTimeAsync(5000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.audio).toBeInstanceOf(Uint8Array)
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
        .mockResolvedValueOnce(mockAudioResponse())

      const promise = provider.synthesize({ text: 'test', voiceId: 'voice-1' })
      await vi.advanceTimersByTimeAsync(3000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.audio).toBeInstanceOf(Uint8Array)
    })

    it('throws after exhausting retries', async () => {
      const makeErrorResp = () => ({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: vi
          .fn()
          .mockResolvedValue(JSON.stringify({ detail: { message: 'Rate limit exceeded' } })),
        headers: new Headers(),
      })
      mockFetch
        .mockResolvedValueOnce(makeErrorResp())
        .mockResolvedValueOnce(makeErrorResp())
        .mockResolvedValueOnce(makeErrorResp())
        .mockResolvedValueOnce(makeErrorResp())

      const promise = provider.synthesize({ text: 'test', voiceId: 'voice-1' })
      const assertion = expect(promise).rejects.toThrow('ElevenLabs API error: Rate limit exceeded')
      await vi.advanceTimersByTimeAsync(60_000)
      await assertion

      expect(mockFetch).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
    })

    it('retries listVoices on 429', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: vi.fn().mockResolvedValue('{}'),
          headers: new Headers(),
        })
        .mockResolvedValueOnce(mockVoicesResponse())

      const promise = provider.listVoices()
      await vi.advanceTimersByTimeAsync(5000)
      const voices = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(voices).toHaveLength(2)
    })
  })

  // =========================================================================
  // Configuration
  // =========================================================================

  describe('configuration', () => {
    it('uses ELEVENLABS_API_KEY env var when no key provided', async () => {
      vi.stubEnv('ELEVENLABS_API_KEY', 'env-key')
      const envProvider = createProvider({ baseUrl: 'https://test.api' })
      mockFetch.mockResolvedValue(mockAudioResponse())

      await envProvider.synthesize({ text: 'test', voiceId: 'voice-1' })

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = init.headers as Record<string, string>
      expect(headers['xi-api-key']).toBe('env-key')
    })

    it('has correct provider name', () => {
      expect(provider.name).toBe('elevenlabs')
    })

    it('defaults to eleven_multilingual_v2 model', async () => {
      mockFetch.mockResolvedValue(mockAudioResponse())

      await provider.synthesize({ text: 'test', voiceId: 'voice-1' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.model_id).toBe('eleven_multilingual_v2')
    })

    it('respects custom default model from config', async () => {
      const customProvider = createProvider({
        apiKey: 'test-key',
        baseUrl: 'https://test.api',
        defaultModel: 'eleven_turbo_v2_5',
      })
      mockFetch.mockResolvedValue(mockAudioResponse())

      await customProvider.synthesize({ text: 'test', voiceId: 'voice-1' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.model_id).toBe('eleven_turbo_v2_5')
    })

    it('respects custom default stability and similarity boost', async () => {
      const customProvider = createProvider({
        apiKey: 'test-key',
        baseUrl: 'https://test.api',
        defaultStability: 0.9,
        defaultSimilarityBoost: 0.3,
      })
      mockFetch.mockResolvedValue(mockAudioResponse())

      await customProvider.synthesize({ text: 'test', voiceId: 'voice-1' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.voice_settings.stability).toBe(0.9)
      expect(body.voice_settings.similarity_boost).toBe(0.3)
    })

    it('respects custom default output format', async () => {
      const customProvider = createProvider({
        apiKey: 'test-key',
        baseUrl: 'https://test.api',
        defaultOutputFormat: 'pcm_24000',
      })
      mockFetch.mockResolvedValue(mockAudioResponse())

      await customProvider.synthesize({ text: 'test', voiceId: 'voice-1' })

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toContain('output_format=pcm_24000')
    })
  })
})
