import { beforeEach, describe, expect, it, vi } from 'vitest'

import { oembed } from '../oembed.js'
import { OEmbedError, type OEmbedResponse } from '../types.js'

// The DNS-aware SSRF guard resolves each host before fetching. Mock
// node:dns/promises so tests are deterministic and offline; by default
// every hostname resolves to a public address, and individual SSRF tests
// override the resolution to a private one.
const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }))
vi.mock('node:dns/promises', () => ({ lookup: lookupMock }))

/**
 * Build a minimal `Response`-like object compatible with what the
 * fetcher reads (status, headers.get, body / text).
 */
function buildResponse(opts: {
  status?: number
  headers?: Record<string, string>
  body?: string
}): Response {
  const status = opts.status ?? 200
  const headers = new Headers(opts.headers ?? {})
  const text = opts.body ?? ''
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text))
      controller.close()
    },
  })
  return new Response(stream, { status, headers })
}

describe('oembed', () => {
  beforeEach(() => {
    lookupMock.mockReset()
    // Default: every host resolves to a public address.
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
  })

  it('uses the built-in YouTube provider without HTML discovery', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      buildResponse({
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'video',
          version: '1.0',
          title: 'Never Gonna Give You Up',
          provider_name: 'YouTube',
          html: '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
          width: 480,
          height: 270,
        }),
      }),
    )

    const r = await oembed('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    })

    expect(r.type).toBe('video')
    expect(r.title).toBe('Never Gonna Give You Up')
    expect(r.provider_name).toBe('YouTube')
    expect(r.html).toContain('<iframe')
    expect(r.width).toBe(480)
    // Direct provider lookup → exactly one HTTP call.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const calledUrl = fetchMock.mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('youtube.com/oembed')
    expect(calledUrl).toContain(encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
  })

  it('falls back to HTML discovery for unknown providers', async () => {
    const html = `<head>
      <link rel="alternate" type="application/json+oembed"
            href="https://media.example.com/oembed?url=foo">
    </head>`
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        buildResponse({
          headers: { 'content-type': 'text/html' },
          body: html,
        }),
      )
      .mockResolvedValueOnce(
        buildResponse({
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            type: 'rich',
            version: '1.0',
            title: 'Discovered',
            html: '<blockquote>hi</blockquote>',
          }),
        }),
      )

    const r = await oembed('https://media.example.com/v/123', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    })

    expect(r.type).toBe('rich')
    expect(r.title).toBe('Discovered')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://media.example.com/oembed?url=foo')
  })

  it('refuses private-network URLs by default (SSRF)', async () => {
    const fetchMock = vi.fn()
    await expect(
      oembed('http://127.0.0.1/embed', {
        fetch: fetchMock as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({
      name: 'OEmbedError',
      code: 'private-network-blocked',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses redirect to private-network during HTML discovery', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      buildResponse({
        status: 302,
        headers: { location: 'http://10.0.0.5/page' },
      }),
    )
    await expect(
      oembed('https://example.com/article', {
        fetch: fetchMock as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({
      name: 'OEmbedError',
      code: 'private-network-blocked',
    })
  })

  it('honors allowPrivateNetworks: true', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      buildResponse({
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'link', version: '1.0', title: 'Internal' }),
      }),
    )
    const r = await oembed('https://www.youtube.com/watch?v=abc', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
      allowPrivateNetworks: true,
    })
    expect(r.title).toBe('Internal')
  })

  it('refuses a host that RESOLVES to a private address (DNS-rebinding SSRF)', async () => {
    // Public-looking hostname, no built-in provider match, whose A record
    // points at the cloud metadata endpoint — caught by the DNS-aware
    // guard before any request goes out.
    lookupMock.mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }])
    const fetchMock = vi.fn()
    await expect(
      oembed('https://rebind.attacker.example/x', {
        fetch: fetchMock as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({ name: 'OEmbedError', code: 'private-network-blocked' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('allows a host that resolves to a public address (discovery path)', async () => {
    lookupMock.mockResolvedValue([{ address: '93.184.216.34', family: 4 }])
    const html = `<head>
      <link rel="alternate" type="application/json+oembed"
            href="https://public.example/oembed?url=foo">
    </head>`
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        buildResponse({ headers: { 'content-type': 'text/html' }, body: html }),
      )
      .mockResolvedValueOnce(
        buildResponse({
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'rich', version: '1.0', title: 'Public' }),
        }),
      )
    const r = await oembed('https://public.example/v/1', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    })
    expect(r.title).toBe('Public')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('sanitizes <script> tags out of returned html', async () => {
    const dirty = '<iframe src="x"></iframe><script>steal()</script>'
    const fetchMock = vi.fn().mockResolvedValueOnce(
      buildResponse({
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'rich',
          version: '1.0',
          html: dirty,
        }),
      }),
    )
    const r = await oembed('https://www.youtube.com/watch?v=abc', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    })
    expect(r.html).not.toMatch(/<script/i)
    expect(r.html).not.toMatch(/steal/)
    expect(r.html).toContain('<iframe')
  })

  it('strips on*= event handlers from returned html', async () => {
    const dirty = '<div onclick="bad()">x</div>'
    const fetchMock = vi.fn().mockResolvedValueOnce(
      buildResponse({
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'rich', version: '1.0', html: dirty }),
      }),
    )
    const r = await oembed('https://www.youtube.com/watch?v=abc', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
    })
    expect(r.html).not.toMatch(/onclick/i)
  })

  it('returns cached result without calling fetch on cache hit', async () => {
    const cached: OEmbedResponse = {
      type: 'video',
      version: '1.0',
      title: 'Cached',
    }
    const cache = {
      get: vi.fn().mockResolvedValue(cached),
      set: vi.fn(),
    }
    const fetchMock = vi.fn()

    const r = await oembed('https://www.youtube.com/watch?v=abc', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
      cache,
    })

    expect(r).toEqual(cached)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(cache.get).toHaveBeenCalledWith('https://www.youtube.com/watch?v=abc')
    expect(cache.set).not.toHaveBeenCalled()
  })

  it('writes to cache on miss', async () => {
    const cache = {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn(),
    }
    const fetchMock = vi.fn().mockResolvedValueOnce(
      buildResponse({
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'video', version: '1.0', title: 'X' }),
      }),
    )
    await oembed('https://www.youtube.com/watch?v=abc', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
      cache,
      cacheTtlMs: 1234,
    })
    expect(cache.set).toHaveBeenCalledTimes(1)
    const args = cache.set.mock.calls[0]
    expect(args?.[0]).toBe('https://www.youtube.com/watch?v=abc')
    expect(args?.[1]).toMatchObject({ type: 'video', title: 'X' })
    expect(args?.[2]).toBe(1234)
  })

  it('rejects malformed URLs', async () => {
    await expect(
      oembed('not a url', { fetch: vi.fn() as unknown as typeof globalThis.fetch }),
    ).rejects.toMatchObject({ name: 'OEmbedError', code: 'invalid-url' })
  })

  it('rejects non-http(s) protocols', async () => {
    await expect(
      oembed('ftp://example.com/x', { fetch: vi.fn() as unknown as typeof globalThis.fetch }),
    ).rejects.toMatchObject({ name: 'OEmbedError', code: 'unsupported-protocol' })
  })

  it('throws no-oembed-endpoint when discovery finds nothing', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      buildResponse({
        headers: { 'content-type': 'text/html' },
        body: '<head><title>x</title></head>',
      }),
    )
    await expect(
      oembed('https://example.com/article', {
        fetch: fetchMock as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({ name: 'OEmbedError', code: 'no-oembed-endpoint' })
  })

  it('throws invalid-oembed-payload on bad JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      buildResponse({
        headers: { 'content-type': 'application/json' },
        body: 'not json',
      }),
    )
    await expect(
      oembed('https://www.youtube.com/watch?v=abc', {
        fetch: fetchMock as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({ name: 'OEmbedError', code: 'invalid-oembed-payload' })
  })

  it('throws invalid-oembed-payload on missing type', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      buildResponse({
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version: '1.0', title: 'no type' }),
      }),
    )
    await expect(
      oembed('https://www.youtube.com/watch?v=abc', {
        fetch: fetchMock as unknown as typeof globalThis.fetch,
      }),
    ).rejects.toMatchObject({ name: 'OEmbedError', code: 'invalid-oembed-payload' })
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
      oembed('https://www.youtube.com/watch?v=abc', {
        fetch: fetchMock as unknown as typeof globalThis.fetch,
        timeoutMs: 10,
      }),
    ).rejects.toMatchObject({ name: 'OEmbedError', code: 'timeout' })
  })

  it('forwards maxWidth/maxHeight to provider endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      buildResponse({
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'video', version: '1.0' }),
      }),
    )
    await oembed('https://www.youtube.com/watch?v=abc', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
      maxWidth: 320,
      maxHeight: 180,
    })
    const calledUrl = fetchMock.mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('maxwidth=320')
    expect(calledUrl).toContain('maxheight=180')
  })

  it('caller-supplied providers override built-ins', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      buildResponse({
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'video', version: '1.0', provider_name: 'CustomYT' }),
      }),
    )
    const r = await oembed('https://www.youtube.com/watch?v=abc', {
      fetch: fetchMock as unknown as typeof globalThis.fetch,
      providers: [
        {
          name: 'CustomYT',
          match: /^https?:\/\/(?:www\.)?youtube\.com\//i,
          endpoint: 'https://example.test/yt-oembed',
        },
      ],
    })
    expect(r.provider_name).toBe('CustomYT')
    const calledUrl = fetchMock.mock.calls[0]?.[0] as string
    expect(calledUrl).toContain('example.test/yt-oembed')
  })

  it('OEmbedError exposes code + url', () => {
    const err = new OEmbedError('http-error', 'HTTP 404', 'https://example.com/missing')
    expect(err.code).toBe('http-error')
    expect(err.url).toBe('https://example.com/missing')
    expect(err.name).toBe('OEmbedError')
    expect(err).toBeInstanceOf(Error)
  })
})
