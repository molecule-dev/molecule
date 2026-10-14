import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MoleculeScreenshotProvider,
  MoleculeServiceError,
  SCREENSHOT_SERVICE_LIMITS,
} from '../provider.js'

const OK_RESULT = {
  data: Buffer.from([137, 80, 78, 71]).toString('base64'),
  mimeType: 'image/png',
  width: 1280,
  height: 800,
  bytes: 4,
}

describe('api-screenshots-molecule', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(OK_RESULT), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const provider = (apiKey = 'mk_test'): MoleculeScreenshotProvider =>
    new MoleculeScreenshotProvider({ apiKey, servicesUrl: 'https://services.test/api/v1/services' })

  it('captures a URL and returns the decoded bytes', async () => {
    const bytes = await provider().capture({ url: 'https://example.com' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://services.test/api/v1/services/screenshots/capture',
      expect.objectContaining({ method: 'POST' }),
    )
    const call = fetchMock.mock.calls[0] as [string, { body: string }]
    const body = JSON.parse(call[1].body) as Record<string, unknown>
    expect(body.url).toBe('https://example.com')
    expect(bytes).toEqual(Buffer.from([137, 80, 78, 71]))
  })

  it('returns the full result with metadata from captureWithMeta', async () => {
    const result = await provider().captureWithMeta(
      { html: '<h1>og</h1>' },
      { width: 1200, height: 630, format: 'jpeg', quality: 90 },
    )
    const call = fetchMock.mock.calls[0] as [string, { body: string }]
    expect(JSON.parse(call[1].body)).toEqual({
      html: '<h1>og</h1>',
      options: { width: 1200, height: 630, format: 'jpeg', quality: 90 },
    })
    expect(result).toEqual(OK_RESULT)
  })

  it('throws the no-key error before any request', async () => {
    await expect(provider('').capture({ html: '<p>x</p>' })).rejects.toMatchObject({
      name: 'MoleculeServiceError',
      status: 401,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [{}, undefined, 'exactly one', 400],
    [{ url: 'https://a.com', html: '<p>x</p>' }, undefined, 'exactly one', 400],
    [{ url: '' }, undefined, '"url"', 400],
    [{ url: 'notaurl' }, undefined, 'http(s)', 400],
    [{ url: 'file:///etc/passwd' }, undefined, 'http(s)', 400],
    [{ url: 'x'.repeat(SCREENSHOT_SERVICE_LIMITS.maxUrlChars + 1) }, undefined, '"url"', 400],
    [{ html: '' }, undefined, '"html"', 400],
    [
      { html: 'x'.repeat(SCREENSHOT_SERVICE_LIMITS.maxHtmlChars + 1) },
      undefined,
      'characters',
      413,
    ],
    [{ html: '<p>x</p>' }, { width: 8 }, '"options.width"', 400],
    [{ html: '<p>x</p>' }, { height: 5000 }, '"options.height"', 400],
    [{ html: '<p>x</p>' }, { scale: 0.5 }, '"options.scale"', 400],
    [{ html: '<p>x</p>' }, { quality: 101 }, '"options.quality"', 400],
    [{ html: '<p>x</p>' }, { delayMs: -1 }, '"options.delayMs"', 400],
    [{ html: '<p>x</p>' }, { format: 'webp' }, '"options.format"', 400],
    [{ html: '<p>x</p>' }, { fullPage: 1 }, '"options.fullPage"', 400],
    [{ html: '<p>x</p>' }, { width: 3840, height: 3840, scale: 3 }, 'pixel budget', 400],
  ] as const)(
    'refuses bad input locally without a request: %j %j',
    async (source, options, messagePart, status) => {
      const error = (await provider()
        .captureWithMeta(source as never, options as never)
        .catch((e: unknown) => e)) as MoleculeServiceError
      expect(error).toBeInstanceOf(MoleculeServiceError)
      expect(error.status).toBe(status)
      expect(error.message).toContain(String(messagePart))
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it('refuses an over-budget fullPage capture against the height cap', async () => {
    await expect(
      provider().captureWithMeta({ html: '<p>x</p>' }, { fullPage: true, width: 3840, scale: 3 }),
    ).rejects.toMatchObject({ message: expect.stringContaining('pixel budget'), status: 400 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps a service refusal to MoleculeServiceError with the hint', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'nope', errorKey: 'hostedServices.error.invalidInput' }),
        {
          status: 400,
        },
      ),
    )
    const error = await provider()
      .capture({ url: 'https://example.com' })
      .catch((e: unknown) => e as MoleculeServiceError)
    expect(error).toBeInstanceOf(MoleculeServiceError)
    expect(error.status).toBe(400)
    expect(error.errorKey).toBe('hostedServices.error.invalidInput')
  })

  it('refuses a plain-http public services URL at construction', () => {
    expect(
      () => new MoleculeScreenshotProvider({ apiKey: 'k', servicesUrl: 'http://api.example.com' }),
    ).toThrow(/must use https/)
  })

  it('accepts a private-network http services URL', () => {
    expect(
      () =>
        new MoleculeScreenshotProvider({
          apiKey: 'k',
          servicesUrl: 'http://host.docker.internal:4316',
        }),
    ).not.toThrow()
  })
})
