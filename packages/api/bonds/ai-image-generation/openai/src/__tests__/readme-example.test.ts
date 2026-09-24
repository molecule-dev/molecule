/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real image-generation
 * core. Only the network is mocked: `fetch` returns an OpenAI Images API JSON
 * response.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProvider, setProvider } from '@molecule/api-ai-image-generation'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds the OpenAI provider and returns a base64 image for gpt-image-1', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-openai-test')
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ created: 1, data: [{ b64_json: 'iVBORw0KGgo=' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ apiKey: process.env.OPENAI_API_KEY, defaultModel: 'gpt-image-1' }))

    const { images } = await requireProvider().generate({
      prompt: 'A lighthouse at dusk, oil painting',
      size: '1536x1024',
    })
    const image = images[0]
    const src = image?.url ?? `data:image/png;base64,${image?.base64 ?? ''}`

    expect(src).toBe('data:image/png;base64,iVBORw0KGgo=')
    expect(src.slice(0, 22)).toBe('data:image/png;base64,')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/v1\/images\/generations$/)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-openai-test')
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: 'gpt-image-1',
      prompt: 'A lighthouse at dusk, oil painting',
      size: '1536x1024',
      n: 1,
    })
  })

  it('snaps an unsupported size to the closest one the model allows', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ created: 1, data: [{ b64_json: 'AA==' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    setProvider(createProvider({ apiKey: 'sk-openai-test', defaultModel: 'gpt-image-1' }))

    await requireProvider().generate({ prompt: 'wide', size: '1920x1080' })
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({ size: '1536x1024' })
  })
})
