/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the OpenAI image bond. Only
 * the network is mocked: `fetch` returns a real `/v1/images/generations` body.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-ai-image-generation-openai'

import { requireProvider, setProvider } from '../index.js'

/** A 68-byte transparent 1x1 PNG, base64-encoded. */
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds the OpenAI provider and generates a base64 image', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test')
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ created: 1, data: [{ b64_json: PNG_BASE64 }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ apiKey: process.env.OPENAI_API_KEY }))

    const { images, model } = await requireProvider().generate({
      prompt: 'A watercolor fox reading a book',
      size: '1024x1024',
      responseFormat: 'base64',
    })

    const image = images[0]
    if (!image?.base64) throw new Error('No image returned')
    const png = Buffer.from(image.base64, 'base64')

    expect(model).toBe('gpt-image-1')
    expect(png.byteLength).toBe(68)
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG')

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/v1\/images\/generations$/)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'gpt-image-1',
      prompt: 'A watercolor fox reading a book',
      size: '1024x1024',
    })
  })
})
