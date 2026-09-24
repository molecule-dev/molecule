/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProvider, setProvider } from '@molecule/app-ai-image-generator'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bonds the provider, generates an image, and loads history', async () => {
    const image = {
      id: 'img-1',
      url: 'https://cdn.example.com/img-1.png',
      prompt: 'A lighthouse at dusk, watercolor',
      createdAt: 1700000000000,
    }
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ images: [image] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ baseUrl: '', headers: { 'X-Client': 'web' } }))

    const generator = requireProvider()
    const config = { endpoint: '/api/images/generate' }

    const events: string[] = []
    const images = await generator.generate(
      { prompt: 'A lighthouse at dusk, watercolor', size: '1024x1024', count: 1 },
      config,
      (event) => {
        events.push(event.type)
      },
    )
    const imageUrl = images[0]?.url

    expect(imageUrl).toBe('https://cdn.example.com/img-1.png')
    expect(images[0]?.width).toBe(1024)
    expect(events).toEqual(['started', 'image', 'done'])

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/images/generate')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['X-Client']).toBe('web')
    expect(JSON.parse(init.body as string)).toEqual({
      prompt: 'A lighthouse at dusk, watercolor',
      size: '1024x1024',
      count: 1,
    })

    const history = await generator.loadHistory(config)
    expect(history.map((i) => i.id)).toEqual(['img-1'])
  })
})
