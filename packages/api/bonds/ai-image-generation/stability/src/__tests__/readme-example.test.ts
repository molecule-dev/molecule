/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real image-generation
 * core. Only the network is mocked: `fetch` returns a Stability v2beta JSON
 * response (base64 image + seed).
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProvider, setProvider } from '@molecule/api-ai-image-generation'

import { createProvider } from '../index.js'

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlz'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds the Stability provider and returns the generated image bytes', async () => {
    vi.stubEnv('STABILITY_API_KEY', 'sk-stability-test')
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ image: PNG_BASE64, seed: 42, finish_reason: 'SUCCESS' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({ apiKey: process.env.STABILITY_API_KEY, defaultModel: 'sd3.5-large' }),
    )

    const { images, model } = await requireProvider().generate({
      prompt: 'A lighthouse at dusk, oil painting',
    })
    const image = images[0]
    if (!image?.base64) throw new Error('Stability returned no image')
    const src = `data:${image.mimeType};base64,${image.base64}`

    expect(model).toBe('sd3.5-large')
    expect(image.seed).toBe(42)
    expect(image.url).toBeUndefined()
    expect(Buffer.isBuffer(image.data)).toBe(true)
    expect(src).toBe(`data:image/png;base64,${PNG_BASE64}`)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/v2beta\/stable-image\/generate\/sd3$/)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-stability-test')
    const form = init.body as FormData
    expect(form.get('prompt')).toBe('A lighthouse at dusk, oil painting')
    expect(form.get('model')).toBe('sd3.5-large')
  })

  it('throws at createProvider() when no API key is configured', () => {
    vi.stubEnv('STABILITY_API_KEY', '')
    expect(() => createProvider({ apiKey: process.env.STABILITY_API_KEY || undefined })).toThrow(
      /STABILITY_API_KEY/,
    )
  })
})
