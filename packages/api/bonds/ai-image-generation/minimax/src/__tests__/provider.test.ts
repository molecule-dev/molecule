import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createProvider,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_TIMEOUT_MS,
  MINIMAX_IMAGE_MAX_REFERENCE_IMAGES,
  MINIMAX_IMAGE_MODELS,
  MinimaxImageError,
  provider,
} from '../provider.js'
import { aiImageGenerationMinimaxSecretDefinitions } from '../secrets.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])

/** Creates a successful JSON response. */
function mockJsonResponse(body: unknown): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue(body),
  }
}

/** Creates a mock error response. */
function mockErrorResponse(status: number, body: string): Record<string, unknown> {
  return {
    ok: false,
    status,
    headers: new Headers(),
    text: vi.fn().mockResolvedValue(body),
  }
}

/** Returns the [url, init] of the nth fetch call. */
function call(n = 0): [string, RequestInit] {
  return mockFetch.mock.calls[n] as [string, RequestInit]
}

/** Parses the JSON body of the nth fetch call. */
function jsonBody(n = 0): Record<string, unknown> {
  return JSON.parse(call(n)[1].body as string) as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MinimaxImageGenerationProvider', () => {
  const envKeys = ['MINIMAX_API_KEY', 'MINIMAX_BASE_URL', 'MINIMAX_IMAGE_MODEL'] as const
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('fetch', mockFetch)
    for (const key of envKeys) {
      savedEnv[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) delete process.env[key]
      else process.env[key] = savedEnv[key]
    }
  })

  const bond = createProvider({ apiKey: 'minimax-key' })

  // =========================================================================
  // generate()
  // =========================================================================

  describe('generate()', () => {
    it('POSTs the JSON body to /v1/images/generations and normalizes the result', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({
          created: 1792308678,
          data: [
            {
              url: 'https://example.com/h3-image/output-0.jpg',
              size: '2720x1536',
              revised_prompt: 'Warm afternoon light streams through ...',
            },
          ],
          output_format: 'jpeg',
          usage: { generated_images: 1, total_tokens: 7254 },
          request_id: '021792308678142a2c883cf675b9804d',
        }),
      )

      const result = await bond.generate({
        prompt: 'A watercolor fox reading a book',
        size: '5472x3072',
      })

      expect(result).toEqual({
        images: [
          {
            url: 'https://example.com/h3-image/output-0.jpg',
            revisedPrompt: 'Warm afternoon light streams through ...',
          },
        ],
        model: DEFAULT_MODEL,
      })
      const [url, init] = call()
      expect(url).toBe(`${DEFAULT_BASE_URL}/v1/images/generations`)
      expect(init.method).toBe('POST')
      expect(init.headers).toEqual({
        Authorization: 'Bearer minimax-key',
        'Content-Type': 'application/json',
      })
      expect(jsonBody()).toEqual({
        model: DEFAULT_MODEL,
        prompt: 'A watercolor fox reading a book',
        n: 1,
        size: '5472x3072',
      })
    })

    it('maps responseFormat base64 to response_format b64_json and Highspeed via model', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ data: [{ b64_json: 'aGVsbG8=' }] }))
      const result = await bond.generate({
        prompt: 'p',
        model: 'MiniMax-H3-Image-Highspeed',
        responseFormat: 'base64',
      })
      expect(jsonBody()).toEqual({
        model: 'MiniMax-H3-Image-Highspeed',
        prompt: 'p',
        n: 1,
        response_format: 'b64_json',
      })
      expect(result.images).toEqual([{ base64: 'aGVsbG8=' }])
    })

    it('omits size for auto and rejects a malformed size before any request', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ data: [{ url: 'https://x/1.jpg' }] }))
      await bond.generate({ prompt: 'p', size: 'auto' })
      expect(jsonBody()).not.toHaveProperty('size')

      await expect(bond.generate({ prompt: 'p', size: '1080p' })).rejects.toMatchObject({
        name: 'MinimaxImageError',
        status: 400,
      })
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('validates n (integer 1-10) and the model enum before any request', async () => {
      for (const n of [0, 11, 2.5]) {
        await expect(bond.generate({ prompt: 'p', n })).rejects.toThrow(/"n" must be an integer/)
      }
      await expect(bond.generate({ prompt: 'p', model: 'MiniMax-H3' })).rejects.toThrow(
        /"model" must be one of/,
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('sends disable_prompt_enhanced only when configured', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ data: [{ url: 'https://x/1.jpg' }] }))
      await bond.generate({ prompt: 'p' })
      expect(jsonBody()).not.toHaveProperty('disable_prompt_enhanced')

      const disabled = createProvider({ apiKey: 'k', disablePromptEnhanced: true })
      await disabled.generate({ prompt: 'p' })
      expect(jsonBody(1).disable_prompt_enhanced).toBe(true)
    })

    it('returns the successes and logs the failed items of a partial HTTP 200', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({
          data: [
            { url: 'https://x/ok.jpg' },
            { error: { code: '1027', message: 'output image failed content safety check' } },
          ],
        }),
      )
      const result = await bond.generate({ prompt: 'p', n: 2 })
      expect(result.images).toEqual([{ url: 'https://x/ok.jpg' }])
    })

    it('throws when every item in the HTTP 200 failed', async () => {
      mockFetch.mockResolvedValue(
        mockJsonResponse({
          data: [{ error: { code: '1027', message: 'output image failed content safety check' } }],
        }),
      )
      const error = (await bond.generate({ prompt: 'p' }).catch((e: unknown) => e)) as Error
      expect(error).toBeInstanceOf(MinimaxImageError)
      expect(error).toMatchObject({ status: 502, code: '1027' })
      expect(error.message).toContain('content safety check')
    })

    it('throws when data[] is empty', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ created: 1 }))
      await expect(bond.generate({ prompt: 'p' })).rejects.toMatchObject({ status: 502 })
    })
  })

  // =========================================================================
  // edit()
  // =========================================================================

  describe('edit()', () => {
    it('POSTs image + images as ordered image_url items to /v1/images/edits', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ data: [{ url: 'https://x/edited.jpg' }] }))
      const result = await bond.edit({
        prompt: 'Replace the cat in image 1 with the dog in image 2',
        image: 'https://example.com/cat.jpg',
        images: ['https://example.com/dog.png'],
        size: 'auto',
      })
      const [url, init] = call()
      expect(url).toBe(`${DEFAULT_BASE_URL}/v1/images/edits`)
      expect(init.method).toBe('POST')
      expect(init.headers).toEqual({
        Authorization: 'Bearer minimax-key',
        'Content-Type': 'application/json',
      })
      expect(jsonBody()).toEqual({
        model: DEFAULT_MODEL,
        prompt: 'Replace the cat in image 1 with the dog in image 2',
        n: 1,
        images: [
          { image_url: 'https://example.com/cat.jpg' },
          { image_url: 'https://example.com/dog.png' },
        ],
      })
      expect(result.model).toBe(DEFAULT_MODEL)
    })

    it('wraps raw bytes and bare base64 in a data: URI with a sniffed MIME type', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ data: [{ url: 'https://x/e.jpg' }] }))
      await bond.edit({
        prompt: 'p',
        image: PNG,
        images: [JPEG, 'aGVsbG8=', 'data:image/webp;base64,AAA', 'mm_file://file-1'],
      })
      const images = jsonBody().images as Array<{ image_url: string }>
      expect(images[0].image_url).toBe(`data:image/png;base64,${PNG.toString('base64')}`)
      expect(images[1].image_url).toBe(`data:image/jpeg;base64,${JPEG.toString('base64')}`)
      expect(images[2].image_url).toBe(`data:image/png;base64,aGVsbG8=`)
      expect(images[3].image_url).toBe('data:image/webp;base64,AAA')
      expect(images[4].image_url).toBe('mm_file://file-1')
    })

    it('refuses a mask and more than 16 references before any request', async () => {
      await expect(bond.edit({ prompt: 'p', image: PNG, mask: PNG })).rejects.toThrow(
        /no masked editing/,
      )
      await expect(
        bond.edit({
          prompt: 'p',
          image: PNG,
          images: Array.from({ length: MINIMAX_IMAGE_MAX_REFERENCE_IMAGES }, () => PNG),
        }),
      ).rejects.toThrow(/at most 16 reference images/)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // configuration
  // =========================================================================

  describe('configuration', () => {
    it('throws the tagged config error when no API key is set', async () => {
      const unconfigured = createProvider()
      await expect(unconfigured.generate({ prompt: 'p' })).rejects.toMatchObject({
        statusCode: 503,
        errorKey: 'config.notConfigured',
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('reads env vars lazily, on each call, including the base-URL override', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({ data: [{ url: 'https://x/1.jpg' }] }))
      process.env.MINIMAX_API_KEY = 'env-key'
      process.env.MINIMAX_IMAGE_MODEL = 'MiniMax-H3-Image-Highspeed'
      process.env.MINIMAX_BASE_URL = 'https://api.minimaxi.com/'

      const result = await provider.generate({ prompt: 'p' })

      const [url, init] = call()
      expect(url).toBe('https://api.minimaxi.com/v1/images/generations')
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer env-key')
      expect(jsonBody()).toMatchObject({ model: 'MiniMax-H3-Image-Highspeed' })
      expect(result.model).toBe('MiniMax-H3-Image-Highspeed')
    })

    it('exposes a typed provider object', () => {
      expect(provider.name).toBe('minimax')
      // `generate`/`edit` are REQUIRED members of the interface, so their
      // presence is already guaranteed by the type annotation on `provider` —
      // a `typeof … === 'function'` check here could never fail. What is worth
      // pinning is the OPTIONAL surface this bond deliberately leaves out.
      expect(provider.generateImage).toBeUndefined()
      expect(provider.imageToImage).toBeUndefined()
      expect(provider.upscale).toBeUndefined()
    })
  })

  // =========================================================================
  // errors
  // =========================================================================

  describe('errors', () => {
    it('throws MinimaxImageError with status and code on a 401', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(
          401,
          JSON.stringify({ error: { code: 2049, message: 'invalid api key' } }),
        ),
      )
      const error = (await bond.generate({ prompt: 'p' }).catch((e: unknown) => e)) as Error
      expect(error).toBeInstanceOf(MinimaxImageError)
      expect(error).toMatchObject({ status: 401, code: '2049' })
      expect(error.message).toContain('invalid api key')
      expect(error).not.toHaveProperty('statusCode')
      expect(error).not.toHaveProperty('errorKey')
    })

    it('carries the raw body on a non-JSON 503 and does not retry', async () => {
      // The endpoint is not idempotent and a retry generates and charges
      // again — no status may be retried, including 429/503.
      mockFetch.mockResolvedValue(mockErrorResponse(503, 'temporarily unavailable'))
      const error = (await bond
        .generate({ prompt: 'p' })
        .catch((e: unknown) => e)) as MinimaxImageError
      expect(error.status).toBe(503)
      expect(error.code).toBeUndefined()
      expect(error.message).toContain('temporarily unavailable')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      mockFetch.mockResolvedValue(
        mockErrorResponse(
          429,
          JSON.stringify({ error: { type: 'rate_limit', message: 'slow down' } }),
        ),
      )
      await expect(bond.generate({ prompt: 'p' })).rejects.toMatchObject({
        status: 429,
        code: 'rate_limit',
      })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('wraps a network failure with status 0', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'))
      await expect(bond.generate({ prompt: 'p' })).rejects.toMatchObject({
        name: 'MinimaxImageError',
        status: 0,
      })
    })

    it('answers a 2xx with a non-JSON body as a typed error, not a raw SyntaxError', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: vi
          .fn()
          .mockRejectedValue(
            new SyntaxError(`Unexpected token '<', "<html>..." is not valid JSON`),
          ),
      })
      const error = (await bond.generate({ prompt: 'p' }).catch((e: unknown) => e)) as Error
      expect(error).toBeInstanceOf(MinimaxImageError)
      expect(error).toMatchObject({ status: 502 })
      expect(error.message).toContain('non-JSON body')
      expect(error.message).toContain('HTTP 200')
    })

    it('answers an error body that dies mid-stream as the typed error, not a raw TypeError', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        headers: new Headers(),
        text: vi.fn().mockRejectedValue(new TypeError('terminated')),
      })
      const error = (await bond.generate({ prompt: 'p' }).catch((e: unknown) => e)) as Error
      expect(error).toBeInstanceOf(MinimaxImageError)
      expect(error).toMatchObject({ status: 502 })
      expect(error.message).toContain('HTTP 502')
    })
  })
})

describe('minimax image constants and secrets', () => {
  it('lists the documented models, caps and defaults', () => {
    expect(MINIMAX_IMAGE_MODELS).toEqual(['MiniMax-H3-Image', 'MiniMax-H3-Image-Highspeed'])
    expect(MINIMAX_IMAGE_MAX_REFERENCE_IMAGES).toBe(16)
    expect(DEFAULT_BASE_URL).toBe('https://api.minimax.io')
    expect(DEFAULT_MODEL).toBe('MiniMax-H3-Image')
    // Just above the API's own 600 s synchronous wait.
    expect(DEFAULT_TIMEOUT_MS).toBe(610_000)
  })

  it('registers its secrets with only the API key required', () => {
    expect(aiImageGenerationMinimaxSecretDefinitions.map((d) => [d.key, d.required])).toEqual([
      ['MINIMAX_API_KEY', true],
      ['MINIMAX_BASE_URL', false],
      ['MINIMAX_IMAGE_MODEL', false],
    ])
  })

  it('registers MINIMAX_API_KEY byte-identically to the chat bond', () => {
    // One console key, one host: the chat bond (@molecule/api-ai-minimax)
    // registers the same definition, and the fleet formula requires packages
    // sharing a key to register byte-identical definitions.
    const [definition] = aiImageGenerationMinimaxSecretDefinitions
    expect(definition).toEqual({
      key: 'MINIMAX_API_KEY',
      description: 'MiniMax API key — Create an interface key in the MiniMax platform user center.',
      helpUrl: 'https://platform.minimax.io/',
      required: true,
    })
  })
})
