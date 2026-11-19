/**
 * Tests for the MiniMax-H3-Image model descriptor and the provider behavior
 * it drives: native ~16 MP size snapping, the required default size, the
 * 16-reference edit cap, the fixed 6-step/no-CFG/no-negative-prompt rules and
 * the absence of masked editing and non-PNG output.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isMinimaxH3Image,
  MINIMAX_H3_IMAGE_DEFAULT_SIZE,
  MINIMAX_H3_IMAGE_GUIDANCE,
  MINIMAX_H3_IMAGE_MAX_REFERENCE_IMAGES,
  MINIMAX_H3_IMAGE_MODEL,
  MINIMAX_H3_IMAGE_SIZES,
  MINIMAX_H3_IMAGE_STEPS,
  nearestMinimaxH3ImageSize,
} from '../minimax-h3-image.js'
import { createProvider } from '../provider.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

/** Creates a successful vLLM-Omni Images API response. */
function mockImagesResponse(
  images: Array<{ b64_json?: string; url?: string | null }>,
): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue({ created: 1701234567, data: images }),
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

/** All values of a FormData as a plain object (last value wins). */
function formValues(form: FormData): Record<string, string> {
  const values: Record<string, string> = {}
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') values[key] = value
  }
  return values
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MiniMax-H3-Image descriptor', () => {
  it('lists the model card native sizes', () => {
    expect(MINIMAX_H3_IMAGE_SIZES).toEqual({
      '1:1': '4096x4096',
      '4:3': '4736x3552',
      '3:4': '3552x4736',
      '3:2': '5024x3360',
      '2:3': '3360x5024',
      '16:9': '5472x3072',
      '9:16': '3072x5472',
      '21:9': '6272x2688',
    })
    expect(MINIMAX_H3_IMAGE_MAX_REFERENCE_IMAGES).toBe(16)
    expect(MINIMAX_H3_IMAGE_STEPS).toBe(6)
    expect(MINIMAX_H3_IMAGE_GUIDANCE).toBe(1)
    expect(MINIMAX_H3_IMAGE_DEFAULT_SIZE).toBe('4096x4096')
  })

  it('matches both H3-Image variants and no other model', () => {
    expect(isMinimaxH3Image(MINIMAX_H3_IMAGE_MODEL)).toBe(true)
    expect(isMinimaxH3Image('MiniMaxAI/MiniMax-H3-Image-Highspeed')).toBe(true)
    expect(isMinimaxH3Image('minimaxai/minimax-h3-image')).toBe(true)
    expect(isMinimaxH3Image('Qwen/Qwen-Image-2.1')).toBe(false)
    expect(isMinimaxH3Image('MiniMaxAI/MiniMax-H3')).toBe(false)
  })

  it('snaps a requested size to the nearest native aspect ratio', () => {
    expect(nearestMinimaxH3ImageSize('1024x1024')).toBe('4096x4096')
    expect(nearestMinimaxH3ImageSize('1920x1080')).toBe('5472x3072')
    expect(nearestMinimaxH3ImageSize('1080x1920')).toBe('3072x5472')
    expect(nearestMinimaxH3ImageSize('3840x1646')).toBe('6272x2688')
    // Non-"WxH" values pass through unchanged.
    expect(nearestMinimaxH3ImageSize('auto')).toBe('auto')
  })
})

describe('VllmOmniImageGenerationProvider with MiniMax-H3-Image', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const bond = createProvider({ baseUrl: 'http://gpu.local:8091' })
  const H3 = MINIMAX_H3_IMAGE_MODEL

  describe('generate()', () => {
    it('sends the required default size when the caller sets none', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'aGVsbG8=' }]))
      await bond.generate({ prompt: 'p', model: H3 })
      expect(jsonBody()).toMatchObject({ model: H3, size: '4096x4096' })
    })

    it('snaps a requested size to the native grid', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'aGVsbG8=' }]))
      await bond.generate({ prompt: 'p', model: H3, size: '1920x1080' })
      expect(jsonBody()).toMatchObject({ size: '5472x3072' })
    })
  })

  describe('generateImage()', () => {
    it('accepts steps 6 / guidance 1 and omits both (the documented form)', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'aGVsbG8=' }]))
      await bond.generateImage({
        prompt: 'p',
        model: H3,
        steps: MINIMAX_H3_IMAGE_STEPS,
        guidanceScale: MINIMAX_H3_IMAGE_GUIDANCE,
        seed: 42,
      })
      const body = jsonBody()
      expect(body).not.toHaveProperty('num_inference_steps')
      expect(body).not.toHaveProperty('true_cfg_scale')
      expect(body).not.toHaveProperty('negative_prompt')
      expect(body.seed).toBe(42)
      expect(body.size).toBe('4096x4096')
    })

    it('throws on steps other than 6, guidance other than 1 or a negative prompt', async () => {
      await expect(bond.generateImage({ prompt: 'p', model: H3, steps: 20 })).rejects.toThrow(
        /6 inference steps or none/,
      )
      await expect(
        bond.generateImage({ prompt: 'p', model: H3, guidanceScale: 7.5 }),
      ).rejects.toThrow(/guidance scale of 1 or none/)
      await expect(
        bond.generateImage({ prompt: 'p', model: H3, negativePrompt: 'blurry' }),
      ).rejects.toThrow(/no negative-prompt support/)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('maps aspectRatio through the native table', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'aGVsbG8=' }]))
      await bond.generateImage({ prompt: 'p', model: H3, aspectRatio: '21:9' })
      expect(jsonBody().size).toBe('6272x2688')
    })
  })

  describe('edit()', () => {
    it('accepts 16 references and sends the required default size', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'aGVsbG8=' }]))
      await bond.edit({
        prompt: 'p',
        model: H3,
        image: PNG,
        images: Array.from({ length: MINIMAX_H3_IMAGE_MAX_REFERENCE_IMAGES - 1 }, () => PNG),
      })
      const form = formBody()
      expect(form.getAll('image')).toHaveLength(MINIMAX_H3_IMAGE_MAX_REFERENCE_IMAGES)
      expect(formValues(form).size).toBe('4096x4096')
    })

    it('refuses a 17th reference and a mask before any request', async () => {
      await expect(
        bond.edit({
          prompt: 'p',
          model: H3,
          image: PNG,
          images: Array.from({ length: MINIMAX_H3_IMAGE_MAX_REFERENCE_IMAGES }, () => PNG),
        }),
      ).rejects.toThrow(/at most 16 reference images/)
      await expect(bond.edit({ prompt: 'p', model: H3, image: PNG, mask: PNG })).rejects.toThrow(
        /no masked editing/,
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('imageToImage()', () => {
    it('omits the rejected controls and keeps PNG output', async () => {
      mockFetch.mockResolvedValue(mockImagesResponse([{ b64_json: 'aGVsbG8=' }]))
      const result = await bond.imageToImage({ prompt: 'p', model: H3, image: PNG, seed: 7 })
      const form = formValues(formBody())
      expect(form.size).toBe('4096x4096')
      expect(form).not.toHaveProperty('num_inference_steps')
      expect(form).not.toHaveProperty('guidance_scale')
      expect(form).not.toHaveProperty('negative_prompt')
      expect(form).not.toHaveProperty('output_format')
      expect(result.images[0].mimeType).toBe('image/png')
    })

    it('refuses a non-PNG output format', async () => {
      await expect(
        bond.imageToImage({ prompt: 'p', model: H3, image: PNG, outputFormat: 'jpeg' }),
      ).rejects.toThrow(/always returns PNG/)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
