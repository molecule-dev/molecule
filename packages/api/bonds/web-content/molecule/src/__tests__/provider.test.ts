import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createProvider,
  MoleculeWebContentProvider,
  WEB_CONTENT_SERVICE_LIMITS,
} from '../provider.js'

const OK_RESULT = {
  url: 'https://example.com/post',
  finalUrl: 'https://example.com/post',
  statusCode: 200,
  contentType: 'text/html; charset=utf-8',
  title: 'A post',
  description: 'About the post.',
  content: '# A post\n\nBody.',
  format: 'markdown',
  truncated: false,
  bytes: 2048,
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.MOLECULE_API_KEY
  delete process.env.MOLECULE_SERVICES_URL
})

describe('molecule web content provider local refusals', () => {
  it('refuses bad input locally without any request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const p = createProvider({ apiKey: 'mk_test' })
    await expect(p.fetch({ url: 'https://e.example.com/', html: '<p>x</p>' })).rejects.toThrow(
      'exactly one',
    )
    await expect(p.fetch({ html: '<p>x</p>' })).rejects.toThrow('exactly one')
    await expect(p.extract({ url: 'https://e.example.com/' })).rejects.toThrow('exactly one')
    await expect(p.fetch({ url: 'file:///etc/passwd' })).rejects.toThrow('http(s) URL')
    await expect(p.fetch({ url: '' })).rejects.toThrow('1-2048')
    await expect(p.fetch({ url: `https://e.example.com/${'x'.repeat(2100)}` })).rejects.toThrow(
      '1-2048',
    )
    await expect(p.extract({ html: '', baseUrl: 'https://e.example.com/' })).rejects.toThrow(
      'non-empty',
    )
    await expect(p.extract({ html: '<p>x</p>', baseUrl: 'nope' })).rejects.toThrow('http(s) URL')
    await expect(p.extract({ html: '<p>x</p>' }, { mode: 'sideways' })).rejects.toThrow(
      '"raw" or "browser"',
    )
    await expect(p.extract({ html: '<p>x</p>' }, { format: 'html' })).rejects.toThrow(
      '"markdown" or "text"',
    )
    await expect(p.extract({ html: '<p>x</p>' }, { includeLinks: 'yes' })).rejects.toThrow(
      'boolean',
    )
    await expect(p.extract({ html: '<p>x</p>' }, { settleMs: 9000 })).rejects.toThrow('0 to 5000')
    await expect(
      p.extract({ html: 'x'.repeat(WEB_CONTENT_SERVICE_LIMITS.maxHtmlChars + 1) }),
    ).rejects.toMatchObject({ status: 413 })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refuses an over-limit HTML locally with 413', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const p = createProvider({ apiKey: 'mk_test' })
    const big = '<p>' + 'x'.repeat(WEB_CONTENT_SERVICE_LIMITS.maxHtmlChars) + '</p>'
    await expect(p.extract({ html: big })).rejects.toMatchObject({ status: 413 })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('throws the no-key error before any request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const p = createProvider({ apiKey: '' })
    await expect(p.fetch({ url: 'https://e.example.com/' })).rejects.toMatchObject({
      name: 'MoleculeServiceError',
      status: 401,
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('refuses a cleartext public MOLECULE_SERVICES_URL at construction', () => {
    expect(() => createProvider({ servicesUrl: 'http://api.example.com/api/v1/services' })).toThrow(
      /must use https/,
    )
    // Loopback and private-network http stay allowed (local services / sandbox gateway).
    expect(() =>
      createProvider({ servicesUrl: 'http://localhost:4310/api/v1/services' }),
    ).not.toThrow()
    expect(() =>
      createProvider({ servicesUrl: 'http://host.docker.internal:4310/api/v1/services' }),
    ).not.toThrow()
  })
})

describe('molecule web content provider round trips', () => {
  it('posts fetch and returns the service result', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(OK_RESULT))
    vi.stubGlobal('fetch', fetchSpy)
    const p = new MoleculeWebContentProvider({
      apiKey: 'mk_test',
      servicesUrl: 'https://s.example.com/api/v1/services',
    })
    const out = await p.fetch(
      { url: 'https://example.com/post' },
      { mode: 'browser', includeLinks: true },
    )
    const [calledUrl, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(calledUrl).toBe('https://s.example.com/api/v1/services/web-content/fetch')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer mk_test')
    expect(JSON.parse(init.body as string)).toEqual({
      url: 'https://example.com/post',
      options: { mode: 'browser', includeLinks: true },
    })
    expect(out.title).toBe('A post')
    expect(out.content).toContain('A post')
  })

  it('posts extract with the base URL', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(jsonResponse({ ...OK_RESULT, url: 'https://e.example.com/' }))
    vi.stubGlobal('fetch', fetchSpy)
    const p = createProvider({ apiKey: 'mk_test' })
    await p.extract({ html: '<h1>Hi</h1>', baseUrl: 'https://e.example.com/' }, { format: 'text' })
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({
      html: '<h1>Hi</h1>',
      baseUrl: 'https://e.example.com/',
      options: { format: 'text' },
    })
  })

  it('maps service errors onto MoleculeServiceError with the scope hint', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            { error: 'token invalid', errorKey: 'hostedServices.error.tokenInvalid' },
            401,
          ),
        ),
    )
    const p = createProvider({ apiKey: 'mk_dead' })
    await expect(p.fetch({ url: 'https://e.example.com/' })).rejects.toMatchObject({
      name: 'MoleculeServiceError',
      status: 401,
      errorKey: 'hostedServices.error.tokenInvalid',
    })
  })

  it('refuses a result without content as an upstream failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ hello: true })))
    const p = createProvider({ apiKey: 'mk_test' })
    await expect(p.fetch({ url: 'https://e.example.com/' })).rejects.toMatchObject({
      name: 'MoleculeServiceError',
      status: 502,
    })
  })
})
