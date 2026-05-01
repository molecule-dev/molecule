import { describe, expect, it, vi } from 'vitest'

import { getLinkPreview } from '../preview.js'
import { LinkPreview, LinkPreviewError } from '../types.js'

/**
 * Build a minimal `Response`-like object compatible with what
 * `getLinkPreview` reads (status, headers.get, body / text). Using
 * stub responses (rather than the global `Response` class) keeps the
 * tests deterministic across Node versions.
 */
function buildResponse(opts: {
  status?: number
  headers?: Record<string, string>
  body?: string
}): Response {
  const status = opts.status ?? 200
  const headers = new Headers(opts.headers ?? {})
  const text = opts.body ?? ''
  // Build a ReadableStream so the truncating reader path executes.
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text))
      controller.close()
    },
  })
  return new Response(stream, { status, headers })
}

describe('getLinkPreview', () => {
  it('returns a full OG card for a typical article page', async () => {
    const html = `
      <html><head>
        <title>fallback</title>
        <meta property="og:title" content="The Article">
        <meta property="og:description" content="A great read.">
        <meta property="og:image" content="https://cdn.example.com/cover.png">
        <meta property="og:site_name" content="Example News">
        <meta property="og:type" content="article">
      </head><body>x</body></html>
    `
    const fetchMock = vi.fn().mockResolvedValue(
      buildResponse({
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: html,
      }),
    )

    const preview = await getLinkPreview('https://example.com/article', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    })

    expect(preview.title).toBe('The Article')
    expect(preview.description).toBe('A great read.')
    expect(preview.image).toBe('https://cdn.example.com/cover.png')
    expect(preview.siteName).toBe('Example News')
    expect(preview.type).toBe('article')
    expect(preview.url).toBe('https://example.com/article')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to Twitter Card when OG is missing', async () => {
    const html = `
      <head>
        <meta name="twitter:title" content="Tw Title">
        <meta name="twitter:description" content="Tw desc">
        <meta name="twitter:image" content="/img.png">
      </head>
    `
    const preview = await getLinkPreview('https://example.com/foo', {
      fetch: vi.fn().mockResolvedValue(
        buildResponse({
          headers: { 'content-type': 'text/html' },
          body: html,
        }),
      ) as unknown as typeof globalThis.fetch,
    })

    expect(preview.title).toBe('Tw Title')
    expect(preview.image).toBe('https://example.com/img.png')
  })

  it('detects oEmbed discovery URL', async () => {
    const html = `
      <head>
        <link rel="alternate" type="application/json+oembed"
              href="https://media.example.com/oembed?url=foo">
      </head>
    `
    const preview = await getLinkPreview('https://media.example.com/v/123', {
      fetch: vi.fn().mockResolvedValue(
        buildResponse({
          headers: { 'content-type': 'text/html' },
          body: html,
        }),
      ) as unknown as typeof globalThis.fetch,
    })

    expect(preview.oembedUrl).toBe('https://media.example.com/oembed?url=foo')
  })

  it('returns graceful nulls for missing fields', async () => {
    const preview = await getLinkPreview('https://example.com/empty', {
      fetch: vi.fn().mockResolvedValue(
        buildResponse({
          headers: { 'content-type': 'text/html' },
          body: '<html><head></head><body></body></html>',
        }),
      ) as unknown as typeof globalThis.fetch,
    })

    expect(preview.title).toBeUndefined()
    expect(preview.description).toBeUndefined()
    expect(preview.image).toBeUndefined()
    expect(preview.url).toBe('https://example.com/empty')
  })

  it('follows redirects and reports the final URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        buildResponse({
          status: 301,
          headers: { location: 'https://example.com/final' },
        }),
      )
      .mockResolvedValueOnce(
        buildResponse({
          status: 200,
          headers: { 'content-type': 'text/html' },
          body: `<head><meta property="og:title" content="Final"></head>`,
        }),
      )

    const preview = await getLinkPreview('https://example.com/start', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    })
    expect(preview.title).toBe('Final')
    expect(preview.url).toBe('https://example.com/final')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws too-many-redirects after the cap', async () => {
    const fetchMock = vi.fn().mockImplementation((u: string) =>
      Promise.resolve(
        buildResponse({
          status: 302,
          headers: { location: `${u}/again` },
        }),
      ),
    )
    await expect(
      getLinkPreview('https://example.com/loop', {
        fetch: fetchMock as unknown as typeof globalThis.fetch,
        maxRedirects: 2,
      }),
    ).rejects.toMatchObject({
      name: 'LinkPreviewError',
      code: 'too-many-redirects',
    })
  })

  it('rejects non-HTML content-type (PDF)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      buildResponse({
        status: 200,
        headers: { 'content-type': 'application/pdf' },
        body: '%PDF-1.4 ...',
      }),
    )
    await expect(
      getLinkPreview('https://example.com/file.pdf', {
        fetch: fetchMock as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({
      name: 'LinkPreviewError',
      code: 'unsupported-content-type',
    })
  })

  it('rejects HTTP error status codes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      buildResponse({
        status: 500,
        headers: { 'content-type': 'text/html' },
      }),
    )
    await expect(
      getLinkPreview('https://example.com/x', {
        fetch: fetchMock as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({
      name: 'LinkPreviewError',
      code: 'http-error',
    })
  })

  it('refuses private-network URLs by default (SSRF)', async () => {
    const fetchMock = vi.fn()
    await expect(
      getLinkPreview('http://127.0.0.1/admin', {
        fetch: fetchMock as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({
      name: 'LinkPreviewError',
      code: 'private-network-blocked',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses redirect to a private-network URL', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      buildResponse({
        status: 302,
        headers: { location: 'http://127.0.0.1/secret' },
      }),
    )
    await expect(
      getLinkPreview('https://example.com/start', {
        fetch: fetchMock as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({
      name: 'LinkPreviewError',
      code: 'private-network-blocked',
    })
  })

  it('honors allowPrivateNetworks: true', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      buildResponse({
        status: 200,
        headers: { 'content-type': 'text/html' },
        body: `<head><meta property="og:title" content="Internal"></head>`,
      }),
    )
    const preview = await getLinkPreview('http://10.0.0.5/admin', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
      allowPrivateNetworks: true,
    })
    expect(preview.title).toBe('Internal')
  })

  it('rejects non-http(s) protocols', async () => {
    await expect(
      getLinkPreview('ftp://example.com/file', {
        fetch: vi.fn() as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({
      name: 'LinkPreviewError',
      code: 'unsupported-protocol',
    })
  })

  it('rejects malformed URLs', async () => {
    await expect(
      getLinkPreview('not a url', {
        fetch: vi.fn() as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({
      name: 'LinkPreviewError',
      code: 'invalid-url',
    })
  })

  it('reports timeout when fetch is aborted', async () => {
    const fetchMock = vi.fn().mockImplementation((_u: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal
        if (signal) {
          signal.addEventListener('abort', () => {
            const err = new Error('aborted') as Error & { name: string }
            err.name = 'AbortError'
            reject(err)
          })
        }
      })
    })
    await expect(
      getLinkPreview('https://slow.example.com/', {
        fetch: fetchMock as unknown as typeof globalThis.fetch,
        timeoutMs: 10,
      }),
    ).rejects.toMatchObject({
      name: 'LinkPreviewError',
      code: 'timeout',
    })
  })

  it('uses cache when provided and avoids refetch on hit', async () => {
    const cached: LinkPreview = {
      title: 'Cached',
      url: 'https://example.com/cached',
      type: 'website',
    }
    const cache = {
      get: vi.fn().mockResolvedValue(cached),
      set: vi.fn(),
    }
    const fetchMock = vi.fn()
    const preview = await getLinkPreview('https://example.com/cached', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
      cache,
    })
    expect(preview).toEqual(cached)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(cache.get).toHaveBeenCalledWith('https://example.com/cached')
    expect(cache.set).not.toHaveBeenCalled()
  })

  it('writes to cache on miss', async () => {
    const cache = {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn(),
    }
    const fetchMock = vi.fn().mockResolvedValue(
      buildResponse({
        headers: { 'content-type': 'text/html' },
        body: `<head><meta property="og:title" content="X"></head>`,
      }),
    )
    await getLinkPreview('https://example.com/x', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
      cache,
      cacheTtlMs: 1234,
    })
    expect(cache.set).toHaveBeenCalledTimes(1)
    const args = cache.set.mock.calls[0]
    expect(args?.[0]).toBe('https://example.com/x')
    expect(args?.[1]).toMatchObject({
      title: 'X',
      url: 'https://example.com/x',
    })
    expect(args?.[2]).toBe(1234)
  })

  it('LinkPreviewError exposes code + url', () => {
    const err = new LinkPreviewError('http-error', 'HTTP 404', 'https://example.com/missing')
    expect(err.code).toBe('http-error')
    expect(err.url).toBe('https://example.com/missing')
    expect(err.name).toBe('LinkPreviewError')
    expect(err).toBeInstanceOf(Error)
  })
})
