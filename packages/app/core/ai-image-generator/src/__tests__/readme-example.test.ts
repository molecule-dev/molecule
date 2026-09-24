/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the default HTTP bond.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/app-ai-image-generator-default'

import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bonds the default provider, streams progress, and resolves the generated images', async () => {
    const image = {
      id: 'img_1',
      url: 'https://cdn.example.com/fox.png',
      prompt: 'A watercolor fox',
      width: 1024,
      height: 1024,
      createdAt: 1700000000000,
    }
    const sse =
      'data: {"type":"started"}\n' +
      'data: {"type":"progress","percent":50}\n' +
      `data: ${JSON.stringify({ type: 'image', image })}\n` +
      `data: ${JSON.stringify({ type: 'done', images: [image] })}\n`
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(sse, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ baseUrl: '' }))

    const generator = requireProvider()
    let percent = 0
    const errors: string[] = []
    const images = await generator.generate(
      { prompt: 'A watercolor fox', size: '1024x1024', count: 1 },
      { endpoint: '/api/images/generate' },
      (event) => {
        if (event.type === 'progress') percent = event.percent
        if (event.type === 'error') errors.push(event.message)
      },
    )

    expect(errors).toEqual([])
    expect(percent).toBe(50)
    expect(images[0]?.url).toBe('https://cdn.example.com/fox.png')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/images/generate')
    expect(JSON.parse(init.body as string)).toMatchObject({
      prompt: 'A watercolor fox',
      size: '1024x1024',
      count: 1,
    })
  })
})
