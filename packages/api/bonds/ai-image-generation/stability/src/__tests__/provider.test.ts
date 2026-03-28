import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()

/** Creates a successful Stability AI JSON response with base64 image data. */
function mockJsonImageResponse(
  image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlz',
  seed = 42,
): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: vi.fn().mockResolvedValue({ image, seed, finish_reason: 'SUCCESS' }),
    arrayBuffer: vi.fn(),
  }
}

/** Creates a successful Stability AI binary response. */
function mockBinaryImageResponse(seed = 42): Record<string, unknown> {
  const data = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) // PNG header bytes
  return {
    ok: true,
    status: 200,
    headers: new Headers({
      'content-type': 'image/png',
      'x-seed': String(seed),
    }),
    json: vi.fn(),
    arrayBuffer: vi.fn().mockResolvedValue(data.buffer),
  }
}

/** Creates a mock error response. */
function mockErrorResponse(
  status: number,
  message = 'Something went wrong',
): Record<string, unknown> {
  return {
    ok: false,
    status,
    statusText: `Status ${status}`,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue({ message }),
  }
}

/** Creates a retryable error response with optional Retry-After header. */
function mockRetryableResponse(
  status: number,
  retryAfter?: string,
): Record<string, unknown> {
  const headers = new Headers()
  if (retryAfter) headers.set('retry-after', retryAfter)
  return {
    ok: false,
    status,
    statusText: `Status ${status}`,
    headers,
    json: vi.fn().mockResolvedValue({ message: 'Rate limited' }),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StabilityAIProvider', () => {
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
  // Configuration
  // =========================================================================

  describe('configuration', () => {
    it('has the correct provider name', () => {
      expect(provider.name).toBe('stability')
    })

    it('throws when no API key is provided', () => {
      const original = process.env['STABILITY_API_KEY']
      delete process.env['STABILITY_API_KEY']
      expect(() => createProvider({})).toThrow('Stability AI API key is required')
      if (original) process.env['STABILITY_API_KEY'] = original
    })

    it('uses STABILITY_API_KEY env var as fallback', () => {
      process.env['STABILITY_API_KEY'] = 'env-test-key'
      const p = createProvider()
      expect(p.name).toBe('stability')
      delete process.env['STABILITY_API_KEY']
    })

    it('uses custom default model', () => {
      const p = createProvider({ apiKey: 'test-key', defaultModel: 'core' })
      expect(p.name).toBe('stability')
    })
  })

  // =========================================================================
  // generate()
  // =========================================================================

  describe('generate()', () => {
    it('generates an image from a text prompt', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      const result = await provider.generate({ prompt: 'a cat in space' })

      expect(result.images).toHaveLength(1)
      expect(result.images[0].mimeType).toBe('image/png')
      expect(result.images[0].data).toBeInstanceOf(Buffer)
      expect(result.images[0].seed).toBe(42)
      expect(result.model).toBe('sd3.5-large')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://test.api/v2beta/stable-image/generate/sd3')
      expect(options.method).toBe('POST')
      expect(options.headers.Authorization).toBe('Bearer test-key')
      expect(options.headers.Accept).toBe('application/json')
    })

    it('sends the prompt and model in form data', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'sunset over mountains', model: 'sd3-large' })

      const [, options] = mockFetch.mock.calls[0]
      const body = options.body as FormData
      expect(body.get('prompt')).toBe('sunset over mountains')
      expect(body.get('model')).toBe('sd3-large')
    })

    it('sends negative prompt when provided', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'a dog', negativePrompt: 'blurry, low quality' })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('negative_prompt')).toBe('blurry, low quality')
    })

    it('sends seed when provided', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'a cat', seed: 12345 })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('seed')).toBe('12345')
    })

    it('sends cfg_scale for guidance scale', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'a cat', guidanceScale: 7.5 })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('cfg_scale')).toBe('7.5')
    })

    it('sends steps for SD3 models', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'a cat', steps: 30 })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('steps')).toBe('30')
    })

    it('sends width and height for SD3 models', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'a cat', width: 1024, height: 768 })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('width')).toBe('1024')
      expect(body.get('height')).toBe('768')
    })

    it('converts width/height to aspect_ratio for Core model', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'a cat', model: 'core', width: 1920, height: 1080 })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('aspect_ratio')).toBe('16:9')
      expect(body.get('width')).toBeNull()
      expect(body.get('height')).toBeNull()
    })

    it('converts width/height to aspect_ratio for Ultra model', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'a cat', model: 'ultra', width: 1080, height: 1920 })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('aspect_ratio')).toBe('9:16')
    })

    it('uses aspect_ratio directly when provided', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'a cat', aspectRatio: '21:9' })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('aspect_ratio')).toBe('21:9')
    })

    it('sends output_format parameter', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'a cat', outputFormat: 'jpeg' })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('output_format')).toBe('jpeg')
    })

    it('sends style_preset for non-SD3 models', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'a cat', model: 'core', stylePreset: 'photographic' })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('style_preset')).toBe('photographic')
    })

    it('generates multiple images when count > 1', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      const result = await provider.generate({ prompt: 'a cat', count: 3 })

      expect(result.images).toHaveLength(3)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('increments seed for multiple images', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'a cat', count: 3, seed: 100 })

      expect(mockFetch).toHaveBeenCalledTimes(3)
      const seeds = mockFetch.mock.calls.map((call) => {
        const body = call[1].body as FormData
        return body.get('seed')
      })
      expect(seeds).toEqual(['100', '101', '102'])
    })

    it('uses correct endpoint for SD3 models', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())
      await provider.generate({ prompt: 'a cat', model: 'sd3.5-large' })
      expect(mockFetch.mock.calls[0][0]).toBe('https://test.api/v2beta/stable-image/generate/sd3')
    })

    it('uses correct endpoint for Core model', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())
      await provider.generate({ prompt: 'a cat', model: 'core' })
      expect(mockFetch.mock.calls[0][0]).toBe('https://test.api/v2beta/stable-image/generate/core')
    })

    it('uses correct endpoint for Ultra model', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())
      await provider.generate({ prompt: 'a cat', model: 'ultra' })
      expect(mockFetch.mock.calls[0][0]).toBe('https://test.api/v2beta/stable-image/generate/ultra')
    })

    it('handles binary image response', async () => {
      mockFetch.mockResolvedValue(mockBinaryImageResponse(99))

      const result = await provider.generate({ prompt: 'a cat' })

      expect(result.images).toHaveLength(1)
      expect(result.images[0].data).toBeInstanceOf(Buffer)
      expect(result.images[0].seed).toBe(99)
    })

    it('returns base64 from JSON responses', async () => {
      const b64 = 'dGVzdGltYWdl'
      mockFetch.mockResolvedValue(mockJsonImageResponse(b64))

      const result = await provider.generate({ prompt: 'a cat' })

      expect(result.images[0].base64).toBe(b64)
    })
  })

  // =========================================================================
  // imageToImage()
  // =========================================================================

  describe('imageToImage()', () => {
    it('transforms an image with a text prompt', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())
      const sourceImage = Buffer.from('fake-image-data')

      const result = await provider.imageToImage({
        prompt: 'make it blue',
        image: sourceImage,
      })

      expect(result.images).toHaveLength(1)
      expect(result.model).toBe('sd3.5-large')

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://test.api/v2beta/stable-image/generate/sd3')
      const body = options.body as FormData
      expect(body.get('prompt')).toBe('make it blue')
      expect(body.get('mode')).toBe('image-to-image')
      expect(body.get('image')).toBeInstanceOf(Blob)
    })

    it('accepts base64-encoded source image', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.imageToImage({
        prompt: 'add sparkles',
        image: Buffer.from('fake-image').toString('base64'),
      })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('image')).toBeInstanceOf(Blob)
    })

    it('sends strength parameter', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.imageToImage({
        prompt: 'make it darker',
        image: Buffer.from('fake-image'),
        strength: 0.75,
      })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('strength')).toBe('0.75')
    })

    it('sends negative prompt and seed', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.imageToImage({
        prompt: 'enhance',
        image: Buffer.from('fake-image'),
        negativePrompt: 'artifacts',
        seed: 777,
      })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('negative_prompt')).toBe('artifacts')
      expect(body.get('seed')).toBe('777')
    })

    it('generates multiple transformed images', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      const result = await provider.imageToImage({
        prompt: 'stylize',
        image: Buffer.from('fake-image'),
        count: 2,
      })

      expect(result.images).toHaveLength(2)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  // =========================================================================
  // upscale()
  // =========================================================================

  describe('upscale()', () => {
    it('upscales an image', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      const result = await provider.upscale({
        image: Buffer.from('small-image'),
      })

      expect(result.images).toHaveLength(1)
      expect(result.model).toBe('upscale-conservative')

      const [url] = mockFetch.mock.calls[0]
      expect(url).toBe('https://test.api/v2beta/stable-image/upscale/conservative')
    })

    it('sends target width and height', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.upscale({
        image: Buffer.from('small-image'),
        width: 2048,
        height: 2048,
      })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('width')).toBe('2048')
      expect(body.get('height')).toBe('2048')
    })

    it('sends prompt when provided', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.upscale({
        image: Buffer.from('small-image'),
        prompt: 'high resolution photo',
      })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('prompt')).toBe('high resolution photo')
    })

    it('sends output format', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.upscale({
        image: Buffer.from('small-image'),
        outputFormat: 'webp',
      })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('output_format')).toBe('webp')
    })

    it('accepts base64-encoded source image', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.upscale({
        image: Buffer.from('small-image').toString('base64'),
      })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('image')).toBeInstanceOf(Blob)
    })
  })

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('throws on 401 unauthorized', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(401, 'Invalid API key'))

      await expect(provider.generate({ prompt: 'a cat' })).rejects.toThrow(
        'Stability AI API error (401): Invalid API key',
      )
    })

    it('throws on 400 bad request', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(400, 'Invalid parameters'))

      await expect(provider.generate({ prompt: 'a cat' })).rejects.toThrow(
        'Stability AI API error (400): Invalid parameters',
      )
    })

    it('throws on 403 forbidden', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(403, 'Insufficient credits'))

      await expect(provider.generate({ prompt: 'a cat' })).rejects.toThrow(
        'Stability AI API error (403): Insufficient credits',
      )
    })

    it('retries on 429 rate limit', async () => {
      mockFetch
        .mockResolvedValueOnce(mockRetryableResponse(429))
        .mockResolvedValueOnce(mockJsonImageResponse())

      const resultPromise = provider.generate({ prompt: 'a cat' })
      await vi.advanceTimersByTimeAsync(1000)
      const result = await resultPromise

      expect(result.images).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('retries on 500 server error', async () => {
      mockFetch
        .mockResolvedValueOnce(mockRetryableResponse(500))
        .mockResolvedValueOnce(mockJsonImageResponse())

      const resultPromise = provider.generate({ prompt: 'a cat' })
      await vi.advanceTimersByTimeAsync(1000)
      const result = await resultPromise

      expect(result.images).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('retries on 503 service unavailable', async () => {
      mockFetch
        .mockResolvedValueOnce(mockRetryableResponse(503))
        .mockResolvedValueOnce(mockJsonImageResponse())

      const resultPromise = provider.generate({ prompt: 'a cat' })
      await vi.advanceTimersByTimeAsync(1000)
      const result = await resultPromise

      expect(result.images).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('respects Retry-After header', async () => {
      mockFetch
        .mockResolvedValueOnce(mockRetryableResponse(429, '5'))
        .mockResolvedValueOnce(mockJsonImageResponse())

      const resultPromise = provider.generate({ prompt: 'a cat' })
      // Should wait 5 seconds as specified by Retry-After
      await vi.advanceTimersByTimeAsync(5000)
      const result = await resultPromise

      expect(result.images).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('exhausts retries and throws', async () => {
      vi.useRealTimers()
      const p = createProvider({ apiKey: 'test-key', baseUrl: 'https://test.api', maxRetries: 0 })
      mockFetch.mockResolvedValue(mockRetryableResponse(429))

      await expect(p.generate({ prompt: 'a cat' })).rejects.toThrow(
        'Stability AI API error (429)',
      )
      expect(mockFetch).toHaveBeenCalledTimes(1)
      vi.useFakeTimers()
    })

    it('falls back to statusText when error body has no message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: new Headers(),
        json: vi.fn().mockResolvedValue({}),
      })

      await expect(provider.generate({ prompt: 'a cat' })).rejects.toThrow(
        'Stability AI API error (422): Unprocessable Entity',
      )
    })

    it('falls back to statusText when error body is not JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 418,
        statusText: "I'm a teapot",
        headers: new Headers(),
        json: vi.fn().mockRejectedValue(new Error('not JSON')),
      })

      await expect(provider.generate({ prompt: 'a cat' })).rejects.toThrow(
        "Stability AI API error (418): I'm a teapot",
      )
    })
  })

  // =========================================================================
  // Dimension to aspect ratio conversion
  // =========================================================================

  describe('dimension to aspect ratio conversion', () => {
    it('maps square dimensions to 1:1', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'a cat', model: 'core', width: 512, height: 512 })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('aspect_ratio')).toBe('1:1')
    })

    it('maps 1920x1080 to 16:9', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'a cat', model: 'ultra', width: 1920, height: 1080 })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('aspect_ratio')).toBe('16:9')
    })

    it('maps 1080x1920 to 9:16', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'a cat', model: 'ultra', width: 1080, height: 1920 })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('aspect_ratio')).toBe('9:16')
    })

    it('maps 800x1200 to 2:3', async () => {
      mockFetch.mockResolvedValue(mockJsonImageResponse())

      await provider.generate({ prompt: 'a cat', model: 'core', width: 800, height: 1200 })

      const body = mockFetch.mock.calls[0][1].body as FormData
      expect(body.get('aspect_ratio')).toBe('2:3')
    })
  })
})
