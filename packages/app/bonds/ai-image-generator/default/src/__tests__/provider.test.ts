vi.mock('@molecule/app-i18n', () => ({
  t: vi.fn(
    (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  ),
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, HttpImageGeneratorProvider } from '../provider.js'

function createMockJsonResponse(body: unknown): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: vi.fn().mockResolvedValue(body),
  }
}

function createMockStreamResponse(lines: string[]): Record<string, unknown> {
  const encoder = new TextEncoder()
  const body = lines.join('\n') + '\n'
  const chunks = [encoder.encode(body)]
  let readIndex = 0

  return {
    ok: true,
    status: 200,
    headers: { get: () => 'text/event-stream' },
    body: {
      getReader: () => ({
        read: vi.fn().mockImplementation(() => {
          if (readIndex < chunks.length) {
            return Promise.resolve({ done: false, value: chunks[readIndex++] })
          }
          return Promise.resolve({ done: true, value: undefined })
        }),
      }),
    },
  }
}

describe('@molecule/app-ai-image-generator-default', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const defaultConfig = {
    endpoint: '/api/images/generate',
    model: 'dall-e-3',
  }

  describe('generate', () => {
    it('should send POST request with prompt and model', async () => {
      mockFetch.mockResolvedValue(
        createMockJsonResponse({
          images: [{ id: 'img-1', url: 'https://example.com/img1.png', prompt: 'A cat' }],
        }),
      )

      const provider = new HttpImageGeneratorProvider({ baseUrl: 'http://localhost:3000' })
      const onEvent = vi.fn()

      await provider.generate({ prompt: 'A cat' }, defaultConfig, onEvent)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/images/generate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ prompt: 'A cat', model: 'dall-e-3' }),
        }),
      )
    })

    it('should include optional request parameters', async () => {
      mockFetch.mockResolvedValue(createMockJsonResponse({ images: [] }))

      const provider = new HttpImageGeneratorProvider()
      const onEvent = vi.fn()

      await provider.generate(
        {
          prompt: 'A dog',
          negativePrompt: 'blurry',
          size: '512x512',
          count: 2,
          format: 'png',
          quality: 'hd',
          style: 'vivid',
        },
        defaultConfig,
        onEvent,
      )

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body).toEqual({
        prompt: 'A dog',
        negativePrompt: 'blurry',
        size: '512x512',
        count: 2,
        format: 'png',
        quality: 'hd',
        style: 'vivid',
        model: 'dall-e-3',
      })
    })

    it('should parse JSON response and emit events', async () => {
      mockFetch.mockResolvedValue(
        createMockJsonResponse({
          images: [
            {
              id: 'img-1',
              url: 'https://example.com/1.png',
              prompt: 'A cat',
              width: 1024,
              height: 1024,
              createdAt: 1000,
            },
            {
              id: 'img-2',
              url: 'https://example.com/2.png',
              prompt: 'A cat',
              width: 1024,
              height: 1024,
              createdAt: 2000,
            },
          ],
        }),
      )

      const provider = new HttpImageGeneratorProvider()
      const onEvent = vi.fn()

      const images = await provider.generate({ prompt: 'A cat' }, defaultConfig, onEvent)

      expect(images).toHaveLength(2)
      expect(images[0].id).toBe('img-1')
      expect(images[1].id).toBe('img-2')

      // Should emit: started, image, image, done
      expect(onEvent).toHaveBeenCalledTimes(4)
      expect(onEvent).toHaveBeenCalledWith({ type: 'started' })
      expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'image' }))
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'done', images: expect.any(Array) }),
      )
    })

    it('should parse SSE stream events', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          'data: {"type":"started"}',
          'data: {"type":"progress","percent":50,"message":"Generating..."}',
          'data: {"type":"image","image":{"id":"img-1","url":"https://example.com/1.png","prompt":"A cat","width":1024,"height":1024,"createdAt":1000}}',
          'data: {"type":"done","images":[{"id":"img-1","url":"https://example.com/1.png","prompt":"A cat","width":1024,"height":1024,"createdAt":1000}]}',
        ]),
      )

      const provider = new HttpImageGeneratorProvider()
      const onEvent = vi.fn()

      const images = await provider.generate({ prompt: 'A cat' }, defaultConfig, onEvent)

      expect(images).toHaveLength(1)
      expect(images[0].id).toBe('img-1')

      expect(onEvent).toHaveBeenCalledTimes(4)
      expect(onEvent).toHaveBeenCalledWith({ type: 'started' })
      expect(onEvent).toHaveBeenCalledWith({
        type: 'progress',
        percent: 50,
        message: 'Generating...',
      })
      expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'image' }))
      expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'done' }))
    })

    it('should skip non-data lines in SSE stream', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse([
          ': comment',
          'event: heartbeat',
          'data: {"type":"started"}',
          'data: {"type":"done","images":[]}',
        ]),
      )

      const provider = new HttpImageGeneratorProvider()
      const onEvent = vi.fn()

      await provider.generate({ prompt: 'A cat' }, defaultConfig, onEvent)

      expect(onEvent).toHaveBeenCalledTimes(2)
    })

    it('should skip malformed JSON in SSE stream', async () => {
      mockFetch.mockResolvedValue(
        createMockStreamResponse(['data: not-json', 'data: {"type":"started"}']),
      )

      const provider = new HttpImageGeneratorProvider()
      const onEvent = vi.fn()

      await provider.generate({ prompt: 'A cat' }, defaultConfig, onEvent)

      expect(onEvent).toHaveBeenCalledTimes(1)
      expect(onEvent).toHaveBeenCalledWith({ type: 'started' })
    })

    it('should emit error event for non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        headers: { get: () => 'application/json' },
        text: vi.fn().mockResolvedValue('Server error'),
      })

      const provider = new HttpImageGeneratorProvider()
      const onEvent = vi.fn()

      const images = await provider.generate({ prompt: 'A cat' }, defaultConfig, onEvent)

      expect(images).toEqual([])
      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        message: 'HTTP {{status}}: {{text}}',
      })
    })

    it('should emit error with structured JSON error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        headers: { get: () => 'application/json' },
        text: vi.fn().mockResolvedValue(JSON.stringify({ error: 'Prompt too long' })),
      })

      const provider = new HttpImageGeneratorProvider()
      const onEvent = vi.fn()

      await provider.generate({ prompt: 'A cat' }, defaultConfig, onEvent)

      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        message: 'Prompt too long',
      })
    })

    it('should emit error when SSE stream body is null', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => 'text/event-stream' },
        body: null,
      })

      const provider = new HttpImageGeneratorProvider()
      const onEvent = vi.fn()

      const images = await provider.generate({ prompt: 'A cat' }, defaultConfig, onEvent)

      expect(images).toEqual([])
      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        message: 'No response body',
      })
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

      const provider = new HttpImageGeneratorProvider()
      const onEvent = vi.fn()

      const images = await provider.generate({ prompt: 'A cat' }, defaultConfig, onEvent)

      expect(images).toEqual([])
      expect(onEvent).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to fetch',
      })
    })

    it('should include custom headers from config', async () => {
      mockFetch.mockResolvedValue(createMockJsonResponse({ images: [] }))

      const provider = new HttpImageGeneratorProvider({
        baseUrl: '',
        headers: { Authorization: 'Bearer token' },
      })
      const onEvent = vi.fn()

      await provider.generate({ prompt: 'A cat' }, defaultConfig, onEvent)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token',
            'Content-Type': 'application/json',
          }),
        }),
      )
    })

    it('should normalize images with default values', async () => {
      mockFetch.mockResolvedValue(
        createMockJsonResponse({
          images: [{ url: 'https://example.com/1.png' }],
        }),
      )

      const provider = new HttpImageGeneratorProvider()
      const onEvent = vi.fn()

      const images = await provider.generate({ prompt: 'A cat' }, defaultConfig, onEvent)

      expect(images[0]).toEqual(
        expect.objectContaining({
          id: 'img-0',
          url: 'https://example.com/1.png',
          prompt: '',
          width: 1024,
          height: 1024,
        }),
      )
      expect(typeof images[0].createdAt).toBe('number')
    })

    it('should use request size for images without explicit dimensions', async () => {
      mockFetch.mockResolvedValue(
        createMockJsonResponse({
          images: [{ id: 'img-1', url: 'https://example.com/1.png' }],
        }),
      )

      const provider = new HttpImageGeneratorProvider()
      const onEvent = vi.fn()

      const images = await provider.generate(
        { prompt: 'A cat', size: '512x512' },
        defaultConfig,
        onEvent,
      )

      expect(images[0].width).toBe(512)
      expect(images[0].height).toBe(512)
    })
  })

  describe('abort', () => {
    it('should abort the current request', async () => {
      let capturedSignal: AbortSignal | undefined
      mockFetch.mockImplementation((_url: string, opts: RequestInit) => {
        capturedSignal = opts.signal as AbortSignal
        return new Promise(() => {}) // never resolves
      })

      const provider = new HttpImageGeneratorProvider()
      const onEvent = vi.fn()
      void provider.generate({ prompt: 'A cat' }, defaultConfig, onEvent)

      provider.abort()

      expect(capturedSignal?.aborted).toBe(true)
    })

    it('should be a no-op when no request is active', () => {
      const provider = new HttpImageGeneratorProvider()
      expect(() => provider.abort()).not.toThrow()
    })

    it('should silently return empty array on abort', async () => {
      mockFetch.mockImplementation((_url: string, opts: RequestInit) => {
        const signal = opts.signal as AbortSignal
        return new Promise((_, reject) => {
          signal.addEventListener('abort', () => {
            const err = new DOMException('Aborted', 'AbortError')
            reject(err)
          })
        })
      })

      const provider = new HttpImageGeneratorProvider()
      const onEvent = vi.fn()
      const promise = provider.generate({ prompt: 'A cat' }, defaultConfig, onEvent)

      provider.abort()

      const images = await promise
      expect(images).toEqual([])
      expect(onEvent).not.toHaveBeenCalled()
    })
  })

  describe('loadHistory', () => {
    it('should return normalized images from GET response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [
            {
              id: 'img-1',
              url: 'https://example.com/1.png',
              prompt: 'A cat',
              width: 1024,
              height: 1024,
              createdAt: 1000,
            },
            {
              id: 'img-2',
              url: 'https://example.com/2.png',
              prompt: 'A dog',
              width: 512,
              height: 512,
              createdAt: 2000,
            },
          ],
        }),
      })

      const provider = new HttpImageGeneratorProvider({ baseUrl: 'http://localhost:3000' })
      const images = await provider.loadHistory(defaultConfig)

      expect(images).toHaveLength(2)
      expect(images[0].id).toBe('img-1')
      expect(images[0].createdAt).toBe(1000)
      expect(images[1].id).toBe('img-2')
    })

    it('should return empty array for non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      const provider = new HttpImageGeneratorProvider()
      const images = await provider.loadHistory(defaultConfig)

      expect(images).toEqual([])
    })

    it('should return empty array on network error', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network error'))

      const provider = new HttpImageGeneratorProvider()
      const images = await provider.loadHistory(defaultConfig)

      expect(images).toEqual([])
    })

    it('should handle response with no images key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      })

      const provider = new HttpImageGeneratorProvider()
      const images = await provider.loadHistory(defaultConfig)

      expect(images).toEqual([])
    })

    it('should normalize ISO string timestamps', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          images: [
            { id: 'img-1', url: 'https://example.com/1.png', createdAt: '2024-01-15T10:30:00Z' },
          ],
        }),
      })

      const provider = new HttpImageGeneratorProvider()
      const images = await provider.loadHistory(defaultConfig)

      expect(images[0].createdAt).toBe(new Date('2024-01-15T10:30:00Z').getTime())
    })
  })

  describe('deleteImage', () => {
    it('should send DELETE request with image ID', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      const provider = new HttpImageGeneratorProvider({ baseUrl: 'http://localhost:3000' })
      await provider.deleteImage('img-123', defaultConfig)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/images/generate/img-123',
        expect.objectContaining({
          method: 'DELETE',
        }),
      )
    })

    it('should URL-encode the image ID', async () => {
      mockFetch.mockResolvedValue({ ok: true })

      const provider = new HttpImageGeneratorProvider()
      await provider.deleteImage('img/with spaces', defaultConfig)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/images/generate/img%2Fwith%20spaces',
        expect.objectContaining({ method: 'DELETE' }),
      )
    })
  })

  describe('createProvider', () => {
    it('should return an HttpImageGeneratorProvider instance', () => {
      const provider = createProvider()
      expect(provider).toBeInstanceOf(HttpImageGeneratorProvider)
      expect(provider.name).toBe('default')
    })

    it('should pass config through', () => {
      const provider = createProvider({ baseUrl: 'http://localhost:5000' })
      expect(provider).toBeInstanceOf(HttpImageGeneratorProvider)
    })
  })
})
