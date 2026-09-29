import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, provider, VllmOmniImageError } from '../provider.js'
import {
  nearestQwenImage21Size,
  QWEN_IMAGE_2_1_MODEL,
  QWEN_IMAGE_2_1_SIZES,
  transparentPrompt,
} from '../qwen-image.js'
import { aiImageGenerationVllmOmniSecretDefinitions } from '../secrets.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])

/** Creates a successful vLLM-Omni Images API response. */
function mockImagesResponse(
  images: Array<{ b64_json?: string; url?: string | null; revised_prompt?: string | null }>,
): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue({ created: 1701234567, data: images }),
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

/** Returns the FormData body of the nth fetch call. */
function formBody(n = 0): FormData {
  return call(n)[1].body as FormData
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VllmOmniImageGenerationProvider', () => {
  const envKeys = ['VLLM_OMNI_BASE_URL', 'VLLM_OMNI_API_KEY', 'VLLM_OMNI_MODEL'] as const
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

  const bond = createProvider({ baseUrl: 'http://gpu.local:8091' })

  // =========================================================================
  // generate()
  // =========================================================================

  describe('generate()', () => {
    it('POSTs JSON to /v1/images/generations and normalizes the result', async () => {
      mockFetch.mockResolvedValue(
        mockImagesResponse([{ b64_json: 'aGVsbG8=', url: null, revised_prompt: null }]),
      )

      const result = await bond.generate({ prompt: 'A red bicycle', size: '1024x1024' })

      expect(result).toEqual({
        images: [{ base64: 'aGVsbG8=', mimeType: 'image/png' }],
        model: 'Qwen/Qwen-Image-2.1',
      })
      const [url, init] = call()
      expect(url).toBe('http://gpu.local:8091/v1/images/generations')
      expect(init.method).toBe('POST')
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(jsonBody()).toEqual({
        model: 'Qwen/Qwen-Image-2.1',
        prompt: 'A red bicycle',
        n: 1,
        response_format: 'b64_json',
        size: '2048x2048',
      })
    })

    it('sends a Bearer token only when an API key is configured', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'x' }]))
      await createProvider({ baseUrl: 'http://gpu.local', apiKey: 'secret' }).generate({
        prompt: 'p',
      })
      expect(call()[1].headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer secret',
      })
    })

    it('omits size when none is requested and keeps non-Qwen sizes unchanged', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'x' }]))
      await bond.generate({ prompt: 'p' })
      expect(jsonBody(0)).not.toHaveProperty('size')

      await bond.generate({ prompt: 'p', model: 'Qwen/Qwen-Image', size: '1024x1024', n: 2 })
      expect(jsonBody(1)).toMatchObject({ model: 'Qwen/Qwen-Image', size: '1024x1024', n: 2 })
    })

    it('does not forward quality, style or responseFormat', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'x' }]))
      await bond.generate({ prompt: 'p', quality: 'hd', style: 'vivid', responseFormat: 'url' })
      const body = jsonBody()
      expect(body).not.toHaveProperty('quality')
      expect(body).not.toHaveProperty('style')
      expect(body.response_format).toBe('b64_json')
    })

    it('keeps revised_prompt when the server sends one', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'x', revised_prompt: 'better' }]))
      const result = await bond.generate({ prompt: 'p' })
      expect(result.images[0].revisedPrompt).toBe('better')
    })
  })

  // =========================================================================
  // generateImage()
  // =========================================================================

  describe('generateImage()', () => {
    it('maps diffusion controls onto the extension fields', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'x' }, { b64_json: 'y' }]))

      const result = await bond.generateImage!({
        prompt: 'A lighthouse',
        negativePrompt: 'blurry',
        steps: 40,
        guidanceScale: 1,
        seed: 42,
        width: 1920,
        height: 1080,
        count: 2,
      })

      expect(jsonBody()).toEqual({
        model: 'Qwen/Qwen-Image-2.1',
        prompt: 'A lighthouse',
        n: 2,
        response_format: 'b64_json',
        size: '2752x1536',
        negative_prompt: 'blurry',
        num_inference_steps: 40,
        true_cfg_scale: 1,
        seed: 42,
      })
      expect(result.images).toEqual([
        { base64: 'x', mimeType: 'image/png', seed: 42 },
        { base64: 'y', mimeType: 'image/png', seed: 42 },
      ])
    })

    it('maps an aspect ratio to the native Qwen-Image-2.1 size', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'x' }]))
      await bond.generateImage!({ prompt: 'p', aspectRatio: '9:16' })
      expect(jsonBody().size).toBe('1536x2752')
    })

    it('ignores an aspect ratio for other models', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'x' }]))
      await bond.generateImage!({ prompt: 'p', aspectRatio: '16:9', model: 'other/model' })
      expect(jsonBody()).not.toHaveProperty('size')
    })
  })

  // =========================================================================
  // edit()
  // =========================================================================

  describe('edit()', () => {
    it('POSTs multipart with repeated image parts and mask_image', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'edited' }]))

      const result = await bond.edit!({
        image: PNG,
        images: [JPEG.toString('base64'), `data:image/png;base64,${PNG.toString('base64')}`],
        prompt: 'Change the background to a beach',
        mask: PNG,
        n: 1,
        size: '1024x768',
      })

      const [url, init] = call()
      expect(url).toBe('http://gpu.local:8091/v1/images/edits')
      expect(init.method).toBe('POST')
      expect(init.headers).toEqual({})
      const form = formBody()
      expect(form.get('model')).toBe('Qwen/Qwen-Image-2.1')
      expect(form.get('prompt')).toBe('Change the background to a beach')
      expect(form.get('response_format')).toBe('b64_json')
      expect(form.get('n')).toBe('1')
      expect(form.get('size')).toBe('2400x1792')
      expect(form.has('mask')).toBe(false)

      const images = form.getAll('image') as File[]
      expect(images).toHaveLength(3)
      expect(images.map((f) => f.type)).toEqual(['image/png', 'image/jpeg', 'image/png'])
      expect(Buffer.from(await images[2].arrayBuffer())).toEqual(PNG)

      const mask = form.get('mask_image') as File
      expect(mask.type).toBe('image/png')
      expect(Buffer.from(await mask.arrayBuffer())).toEqual(PNG)

      expect(result).toEqual({
        images: [{ base64: 'edited', mimeType: 'image/png' }],
        model: 'Qwen/Qwen-Image-2.1',
      })
    })

    it('passes size "auto" through unchanged', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'x' }]))
      await bond.edit!({ image: PNG, prompt: 'p', size: 'auto' })
      expect(formBody().get('size')).toBe('auto')
    })

    it('refuses more than 10 reference images for Qwen-Image-2.1 before any request', async () => {
      await expect(
        bond.edit!({ image: PNG, images: Array.from({ length: 10 }, () => PNG), prompt: 'p' }),
      ).rejects.toThrow(/at most 10 reference images/)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // imageToImage()
  // =========================================================================

  describe('imageToImage()', () => {
    it('sends one image to the edits endpoint with the edit-API field names', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'x' }]))

      const result = await bond.imageToImage!({
        image: JPEG,
        prompt: 'Make it night',
        strength: 0.5,
        guidanceScale: 4,
        steps: 30,
        seed: 7,
        negativePrompt: 'noise',
        outputFormat: 'webp',
        count: 1,
      })

      expect(call()[0]).toBe('http://gpu.local:8091/v1/images/edits')
      const form = formBody()
      expect(form.getAll('image')).toHaveLength(1)
      expect((form.get('image') as File).type).toBe('image/jpeg')
      expect(form.get('guidance_scale')).toBe('4')
      expect(form.get('num_inference_steps')).toBe('30')
      expect(form.get('seed')).toBe('7')
      expect(form.get('negative_prompt')).toBe('noise')
      expect(form.get('output_format')).toBe('webp')
      expect(form.get('n')).toBe('1')
      expect(form.has('strength')).toBe(false)
      expect(result.images).toEqual([{ base64: 'x', mimeType: 'image/webp', seed: 7 }])
    })
  })

  // =========================================================================
  // configuration
  // =========================================================================

  describe('configuration', () => {
    it('throws the tagged config error when no base URL is set', async () => {
      const unconfigured = createProvider()
      await expect(unconfigured.generate({ prompt: 'p' })).rejects.toMatchObject({
        statusCode: 503,
        errorKey: 'config.notConfigured',
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('reads env vars lazily, on each call', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'x' }]))
      process.env.VLLM_OMNI_BASE_URL = 'http://late.example:8000/v1/'
      process.env.VLLM_OMNI_API_KEY = 'env-key'
      process.env.VLLM_OMNI_MODEL = 'Qwen/Qwen-Image'

      const result = await provider.generate({ prompt: 'p' })

      const [url, init] = call()
      expect(url).toBe('http://late.example:8000/v1/images/generations')
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer env-key')
      expect(result.model).toBe('Qwen/Qwen-Image')
    })

    it('exposes a typed provider object', () => {
      expect(provider.name).toBe('vllm-omni')
      expect(typeof provider.generate).toBe('function')
      expect(typeof provider.generateImage).toBe('function')
      expect(typeof provider.edit).toBe('function')
      expect(typeof provider.imageToImage).toBe('function')
      expect(provider.upscale).toBeUndefined()
    })
  })

  // =========================================================================
  // errors
  // =========================================================================

  describe('errors', () => {
    it('throws VllmOmniImageError with status and code on a 4xx', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(
          400,
          JSON.stringify({ error: { message: 'Invalid size', code: 'invalid_size' } }),
        ),
      )
      const error = (await bond.generate({ prompt: 'p' }).catch((e: unknown) => e)) as Error
      expect(error).toBeInstanceOf(VllmOmniImageError)
      expect(error).toMatchObject({ status: 400, code: 'invalid_size' })
      expect(error.message).toContain('Invalid size')
      expect(error).not.toHaveProperty('statusCode')
      expect(error).not.toHaveProperty('errorKey')
    })

    it('carries the raw body on a non-JSON 503 and does not retry', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(503, 'Diffusion engine not initialized'))
      const error = (await bond
        .generate({ prompt: 'p' })
        .catch((e: unknown) => e)) as VllmOmniImageError
      expect(error.status).toBe(503)
      expect(error.code).toBeUndefined()
      expect(error.message).toContain('Diffusion engine not initialized')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('wraps a network failure with status 0', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'))
      await expect(bond.generate({ prompt: 'p' })).rejects.toMatchObject({
        name: 'VllmOmniImageError',
        status: 0,
      })
    })
  })
})

describe('qwen-image helpers', () => {
  it('snaps sizes to the nearest native aspect ratio', () => {
    expect(nearestQwenImage21Size('1024x1024')).toBe('2048x2048')
    expect(nearestQwenImage21Size('1080x1920')).toBe('1536x2752')
    expect(nearestQwenImage21Size('1500x1000')).toBe('2528x1696')
    expect(nearestQwenImage21Size('auto')).toBe('auto')
    expect(Object.keys(QWEN_IMAGE_2_1_SIZES)).toHaveLength(7)
    expect(QWEN_IMAGE_2_1_MODEL).toBe('Qwen/Qwen-Image-2.1')
  })

  it('builds the transparent-output prompt template', () => {
    expect(transparentPrompt('A red sneaker.')).toBe(
      'This is an RGBA image with transparency. A red sneaker. The image has alpha channel and the background is transparent.',
    )
  })

  it('registers its secrets with only the base URL required', () => {
    expect(aiImageGenerationVllmOmniSecretDefinitions.map((d) => [d.key, d.required])).toEqual([
      ['VLLM_OMNI_BASE_URL', true],
      ['VLLM_OMNI_API_KEY', false],
      ['VLLM_OMNI_MODEL', false],
    ])
  })
})
