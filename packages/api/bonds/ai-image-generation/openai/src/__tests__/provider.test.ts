import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()

/** Creates a successful OpenAI Images API response. */
function mockImagesResponse(
  images: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>,
): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue({
      created: 1700000000,
      data: images,
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

describe('OpenaiImageGenerationProvider', () => {
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
  // generate()
  // =========================================================================

  describe('generate()', () => {
    it('generates an image from a text prompt', async () => {
      mockFetch.mockResolvedValue(
        mockImagesResponse([
          {
            url: 'https://example.com/image.png',
            revised_prompt: 'A beautiful sunset over the ocean with orange and pink clouds',
          },
        ]),
      )

      const result = await provider.generate({ prompt: 'A sunset over the ocean' })

      expect(result.images).toHaveLength(1)
      expect(result.images[0].url).toBe('https://example.com/image.png')
      expect(result.images[0].revisedPrompt).toBe(
        'A beautiful sunset over the ocean with orange and pink clouds',
      )
      expect(result.model).toBe('gpt-image-1')

      // Verify fetch was called correctly
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://test.api/v1/images/generations')
      const body = JSON.parse(init.body as string)
      expect(body.model).toBe('gpt-image-1')
      expect(body.prompt).toBe('A sunset over the ocean')
      expect(body.n).toBe(1)
      expect(body.size).toBe('1024x1024')
    })

    it('generates multiple images', async () => {
      mockFetch.mockResolvedValue(
        mockImagesResponse([
          { url: 'https://example.com/image1.png' },
          { url: 'https://example.com/image2.png' },
        ]),
      )

      const result = await provider.generate({ prompt: 'A cat', n: 2 })

      expect(result.images).toHaveLength(2)
      expect(result.images[0].url).toBe('https://example.com/image1.png')
      expect(result.images[1].url).toBe('https://example.com/image2.png')

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      )
      expect(body.n).toBe(2)
    })

    it('uses custom model when specified', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ url: 'https://example.com/img.png' }]))

      await provider.generate({ prompt: 'test', model: 'dall-e-3' })

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      )
      expect(body.model).toBe('dall-e-3')
    })

    it('sends custom size and quality', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ url: 'https://example.com/img.png' }]))

      await provider.generate({
        prompt: 'test',
        size: '1792x1024',
        quality: 'hd',
      })

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      )
      expect(body.size).toBe('1792x1024')
      expect(body.quality).toBe('hd')
    })

    it('sends style parameter for DALL-E 3', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ url: 'https://example.com/img.png' }]))

      await provider.generate({
        prompt: 'test',
        model: 'dall-e-3',
        style: 'natural',
      })

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      )
      expect(body.style).toBe('natural')
    })

    it('uses response_format b64_json for DALL-E base64 mode', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'aW1hZ2VkYXRh' }]))

      const result = await provider.generate({
        prompt: 'test',
        model: 'dall-e-3',
        responseFormat: 'base64',
      })

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      )
      expect(body.response_format).toBe('b64_json')
      expect(result.images[0].base64).toBe('aW1hZ2VkYXRh')
    })

    it('uses output_format png for gpt-image-1', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'aW1hZ2VkYXRh' }]))

      await provider.generate({ prompt: 'test', model: 'gpt-image-1' })

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      )
      expect(body.output_format).toBe('png')
      expect(body.response_format).toBeUndefined()
    })

    it('uses default quality from config', async () => {
      const customProvider = createProvider({
        apiKey: 'test-key',
        baseUrl: 'https://test.api',
        defaultQuality: 'high',
      })
      mockFetch.mockResolvedValue(mockImagesResponse([{ url: 'https://example.com/img.png' }]))

      await customProvider.generate({ prompt: 'test' })

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      )
      expect(body.quality).toBe('high')
    })

    it('sends correct Authorization header', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ url: 'https://example.com/img.png' }]))

      await provider.generate({ prompt: 'test' })

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = init.headers as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer test-key')
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('maps images without url or base64 gracefully', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{}]))

      const result = await provider.generate({ prompt: 'test' })

      expect(result.images).toHaveLength(1)
      expect(result.images[0].url).toBeUndefined()
      expect(result.images[0].base64).toBeUndefined()
      expect(result.images[0].revisedPrompt).toBeUndefined()
    })
  })

  // =========================================================================
  // edit()
  // =========================================================================

  describe('edit()', () => {
    it('sends image as multipart form data', async () => {
      mockFetch.mockResolvedValue(
        mockImagesResponse([{ url: 'https://example.com/edited.png' }]),
      )

      const imageBuffer = Buffer.from('fake-image-data')
      const result = await provider.edit({
        image: imageBuffer,
        prompt: 'Add a hat',
      })

      expect(result.images).toHaveLength(1)
      expect(result.images[0].url).toBe('https://example.com/edited.png')
      expect(result.model).toBe('gpt-image-1')

      // Verify fetch called with FormData
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://test.api/v1/images/edits')
      expect(init.body).toBeInstanceOf(FormData)
    })

    it('accepts base64 string as image input', async () => {
      mockFetch.mockResolvedValue(
        mockImagesResponse([{ url: 'https://example.com/edited.png' }]),
      )

      const base64Image = Buffer.from('fake-image-data').toString('base64')
      const result = await provider.edit({
        image: base64Image,
        prompt: 'Make it blue',
      })

      expect(result.images).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('includes mask when provided', async () => {
      mockFetch.mockResolvedValue(
        mockImagesResponse([{ url: 'https://example.com/edited.png' }]),
      )

      const imageBuffer = Buffer.from('fake-image-data')
      const maskBuffer = Buffer.from('fake-mask-data')
      await provider.edit({
        image: imageBuffer,
        prompt: 'Remove background',
        mask: maskBuffer,
      })

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      const formData = init.body as FormData
      expect(formData.get('mask')).toBeTruthy()
    })

    it('sends optional size and n parameters', async () => {
      mockFetch.mockResolvedValue(
        mockImagesResponse([{ url: 'https://example.com/edited.png' }]),
      )

      const imageBuffer = Buffer.from('fake-image-data')
      await provider.edit({
        image: imageBuffer,
        prompt: 'Edit',
        n: 3,
        size: '512x512',
      })

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      const formData = init.body as FormData
      expect(formData.get('n')).toBe('3')
      expect(formData.get('size')).toBe('512x512')
    })

    it('uses correct model in form data', async () => {
      mockFetch.mockResolvedValue(
        mockImagesResponse([{ url: 'https://example.com/edited.png' }]),
      )

      const imageBuffer = Buffer.from('fake-image-data')
      await provider.edit({
        image: imageBuffer,
        prompt: 'Edit',
        model: 'dall-e-2',
      })

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      const formData = init.body as FormData
      expect(formData.get('model')).toBe('dall-e-2')
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

      await expect(provider.generate({ prompt: 'test' })).rejects.toThrow(
        'OpenAI Images API error: Incorrect API key provided',
      )
    })

    it('throws on 400 bad request', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(
          400,
          JSON.stringify({
            error: { message: 'Your request was rejected as a result of our safety system.' },
          }),
        ),
      )

      await expect(provider.generate({ prompt: 'test' })).rejects.toThrow(
        'OpenAI Images API error: Your request was rejected as a result of our safety system.',
      )
    })

    it('throws with HTTP status when error body is not JSON', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(500, 'Internal Server Error'))

      await expect(provider.generate({ prompt: 'test' })).rejects.toThrow(
        'OpenAI Images API error: Internal Server Error',
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
        .mockResolvedValueOnce(
          mockImagesResponse([{ url: 'https://example.com/img.png' }]),
        )

      const promise = provider.generate({ prompt: 'test' })
      await vi.advanceTimersByTimeAsync(5000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.images).toHaveLength(1)
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
        .mockResolvedValueOnce(
          mockImagesResponse([{ url: 'https://example.com/img.png' }]),
        )

      const promise = provider.generate({ prompt: 'test' })
      await vi.advanceTimersByTimeAsync(5000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.images).toHaveLength(1)
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
        .mockResolvedValueOnce(
          mockImagesResponse([{ url: 'https://example.com/img.png' }]),
        )

      const promise = provider.generate({ prompt: 'test' })
      await vi.advanceTimersByTimeAsync(3000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.images).toHaveLength(1)
    })

    it('throws after exhausting retries', async () => {
      const makeErrorResp = () => ({
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

      const promise = provider.generate({ prompt: 'test' })
      const assertion = expect(promise).rejects.toThrow(
        'OpenAI Images API error: Rate limit exceeded',
      )
      await vi.advanceTimersByTimeAsync(60_000)
      await assertion

      expect(mockFetch).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
    })
  })

  // =========================================================================
  // Configuration
  // =========================================================================

  describe('configuration', () => {
    it('uses OPENAI_API_KEY env var when no key provided', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'env-key')
      const envProvider = createProvider({ baseUrl: 'https://test.api' })
      mockFetch.mockResolvedValue(
        mockImagesResponse([{ url: 'https://example.com/img.png' }]),
      )

      await envProvider.generate({ prompt: 'test' })

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = init.headers as Record<string, string>
      expect(headers['Authorization']).toBe('Bearer env-key')
    })

    it('has correct provider name', () => {
      expect(provider.name).toBe('openai')
    })

    it('defaults to gpt-image-1 model', async () => {
      mockFetch.mockResolvedValue(
        mockImagesResponse([{ url: 'https://example.com/img.png' }]),
      )

      const result = await provider.generate({ prompt: 'test' })

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      )
      expect(body.model).toBe('gpt-image-1')
      expect(result.model).toBe('gpt-image-1')
    })

    it('respects custom default model from config', async () => {
      const customProvider = createProvider({
        apiKey: 'test-key',
        baseUrl: 'https://test.api',
        defaultModel: 'dall-e-3',
      })
      mockFetch.mockResolvedValue(mockImagesResponse([{ url: 'https://example.com/img.png' }]))

      await customProvider.generate({ prompt: 'test' })

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      )
      expect(body.model).toBe('dall-e-3')
    })

    it('respects custom default size from config', async () => {
      const customProvider = createProvider({
        apiKey: 'test-key',
        baseUrl: 'https://test.api',
        defaultSize: '1536x1024',
      })
      mockFetch.mockResolvedValue(mockImagesResponse([{ url: 'https://example.com/img.png' }]))

      await customProvider.generate({ prompt: 'test' })

      const body = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      )
      expect(body.size).toBe('1536x1024')
    })
  })
})
