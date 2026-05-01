/**
 * Tests for `@molecule/api-breach-check`.
 *
 * Covers:
 * - SHA-1 split (k-anonymity prefix correctness — never sends full hash)
 * - Suffix lookup parser (CRLF response, padded entries, missing suffix)
 * - `checkPassword` happy paths (pwned + never-pwned)
 * - API error handling (non-2xx, fetch rejection, timeout)
 * - User-Agent + Add-Padding header negotiation
 * - Cache adapter integration
 */

import { describe, expect, it, vi } from 'vitest'

import { checkPassword, findCountForSuffix } from '../checkPassword.js'
import { sha1Split } from '../sha1Prefix.js'
import type { BreachCheckCache } from '../types.js'

// SHA-1('password') = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8 (uppercase)
const PASSWORD_SHA1_PREFIX = '5BAA6'
const PASSWORD_SHA1_SUFFIX = '1E4C9B93F3F0682250B6CF8331B7EE68FD8'

// SHA-1('correct horse battery staple') = ABF7AAD6438836DBE526AA231ABDE2D0EEF74D42
const PHRASE_SHA1_PREFIX = 'ABF7A'
const PHRASE_SHA1_SUFFIX = 'AD6438836DBE526AA231ABDE2D0EEF74D42'

const buildResponse = (body: string, init: ResponseInit = {}): Response =>
  new Response(body, { status: 200, ...init })

describe('sha1Split', () => {
  it('produces a 5-char uppercase prefix and 35-char uppercase suffix', () => {
    const { prefix, suffix } = sha1Split('password')

    expect(prefix).toHaveLength(5)
    expect(suffix).toHaveLength(35)
    expect(prefix).toBe(PASSWORD_SHA1_PREFIX)
    expect(suffix).toBe(PASSWORD_SHA1_SUFFIX)
    expect(prefix).toBe(prefix.toUpperCase())
    expect(suffix).toBe(suffix.toUpperCase())
  })

  it('matches SHA-1 across multiple distinct inputs (k-anonymity correctness)', () => {
    expect(sha1Split('correct horse battery staple')).toEqual({
      prefix: PHRASE_SHA1_PREFIX,
      suffix: PHRASE_SHA1_SUFFIX,
    })
    expect(sha1Split('').prefix).toBe('DA39A')
    expect(sha1Split('').suffix).toHaveLength(35)
  })

  it('handles unicode plaintext correctly', () => {
    const split = sha1Split('pässwörd')
    expect(split.prefix).toHaveLength(5)
    expect(split.suffix).toHaveLength(35)
  })
})

describe('findCountForSuffix', () => {
  it('returns the count when suffix is present', () => {
    const body = `${PASSWORD_SHA1_SUFFIX}:12345\r\nDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEA:7`
    expect(findCountForSuffix(body, PASSWORD_SHA1_SUFFIX)).toBe(12345)
  })

  it('returns 0 when suffix is absent', () => {
    const body = `DEADBEEFDEADBEEFDEADBEEFDEADBEEFDEA:7\r\nFEEDFACEFEEDFACEFEEDFACEFEEDFACEFEE:9`
    expect(findCountForSuffix(body, PASSWORD_SHA1_SUFFIX)).toBe(0)
  })

  it('treats padded entries (count=0) as not-found', () => {
    const body = `${PASSWORD_SHA1_SUFFIX}:0\r\nDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEA:0`
    expect(findCountForSuffix(body, PASSWORD_SHA1_SUFFIX)).toBe(0)
  })

  it('handles LF-only line separators', () => {
    const body = `${PASSWORD_SHA1_SUFFIX}:42\nDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEA:1`
    expect(findCountForSuffix(body, PASSWORD_SHA1_SUFFIX)).toBe(42)
  })

  it('is case-insensitive on the suffix', () => {
    const body = `${PASSWORD_SHA1_SUFFIX.toLowerCase()}:9`
    expect(findCountForSuffix(body, PASSWORD_SHA1_SUFFIX)).toBe(9)
  })

  it('returns 0 for empty body', () => {
    expect(findCountForSuffix('', PASSWORD_SHA1_SUFFIX)).toBe(0)
  })
})

describe('checkPassword', () => {
  it('returns pwned=false, count=0 when the suffix is not in the response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        buildResponse(
          'DEADBEEFDEADBEEFDEADBEEFDEADBEEFDEA:1\r\nFEEDFACEFEEDFACEFEEDFACEFEEDFACEFEE:2',
        ),
      )

    const result = await checkPassword('password', { fetch: fetchMock })

    expect(result).toEqual({ pwned: false, count: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns pwned=true, count=N when the suffix is present', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        buildResponse(`DEADBEEFDEADBEEFDEADBEEFDEADBEEFDEA:1\r\n${PASSWORD_SHA1_SUFFIX}:99999`),
      )

    const result = await checkPassword('password', { fetch: fetchMock })

    expect(result).toEqual({ pwned: true, count: 99999 })
  })

  it('only sends the 5-char prefix to HIBP, never the full hash', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse(''))

    await checkPassword('password', { fetch: fetchMock })

    const calledUrl = fetchMock.mock.calls[0][0] as string

    expect(calledUrl).toBe(`https://api.pwnedpasswords.com/range/${PASSWORD_SHA1_PREFIX}`)
    // Hard guarantee: the full SHA-1 must never appear in the request URL.
    expect(calledUrl).not.toContain(PASSWORD_SHA1_SUFFIX)
    expect(calledUrl).not.toContain(`${PASSWORD_SHA1_PREFIX}${PASSWORD_SHA1_SUFFIX}`)
    // And the path segment must be exactly the 5-char prefix — nothing more.
    const pathSegment = calledUrl.split('/').pop()
    expect(pathSegment).toBe(PASSWORD_SHA1_PREFIX)
    expect(pathSegment).toHaveLength(5)
  })

  it('sends Add-Padding header by default and User-Agent', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse(''))

    await checkPassword('password', { fetch: fetchMock })

    const init = fetchMock.mock.calls[0][1] as RequestInit
    const headers = init.headers as Record<string, string>

    expect(headers['User-Agent']).toBe('molecule-api-breach-check')
    expect(headers['Add-Padding']).toBe('true')
  })

  it('omits Add-Padding when padding=false', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse(''))

    await checkPassword('password', { fetch: fetchMock, padding: false })

    const init = fetchMock.mock.calls[0][1] as RequestInit
    const headers = init.headers as Record<string, string>

    expect(headers['Add-Padding']).toBeUndefined()
  })

  it('honors custom userAgent option', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse(''))

    await checkPassword('password', { fetch: fetchMock, userAgent: 'my-app/1.2.3' })

    const init = fetchMock.mock.calls[0][1] as RequestInit
    const headers = init.headers as Record<string, string>

    expect(headers['User-Agent']).toBe('my-app/1.2.3')
  })

  it('honors custom apiUrl option (and strips trailing slashes)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(buildResponse(''))

    await checkPassword('password', {
      fetch: fetchMock,
      apiUrl: 'https://proxy.example.com/hibp/range//',
    })

    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://proxy.example.com/hibp/range/${PASSWORD_SHA1_PREFIX}`,
    )
  })

  it('throws a generic error (not containing plaintext) on non-2xx response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response('upstream error', { status: 503, statusText: 'Service Unavailable' }),
      )

    let threw: unknown
    try {
      await checkPassword('hunter2', { fetch: fetchMock })
    } catch (error) {
      threw = error
    }

    expect(threw).toBeInstanceOf(Error)
    expect((threw as Error).message).toMatch(/HIBP API returned 503/)
    expect((threw as Error).message).not.toContain('hunter2')
  })

  it('throws when fetch rejects', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))

    await expect(checkPassword('password', { fetch: fetchMock })).rejects.toThrow('network down')
  })

  it('throws when no fetch implementation is available', async () => {
    const originalFetch = globalThis.fetch
    // @ts-expect-error: deliberately unset to exercise the "no fetch" branch
    globalThis.fetch = undefined

    try {
      await expect(checkPassword('password')).rejects.toThrow(/no fetch implementation/)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('uses cached body when cache hit, skipping fetch', async () => {
    const cachedBody = `${PASSWORD_SHA1_SUFFIX}:50`
    const cache: BreachCheckCache = {
      get: vi.fn().mockResolvedValue(cachedBody),
      set: vi.fn(),
    }

    const fetchMock = vi.fn()

    const result = await checkPassword('password', { fetch: fetchMock, cache })

    expect(result).toEqual({ pwned: true, count: 50 })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(cache.get).toHaveBeenCalledWith(`breach-check:${PASSWORD_SHA1_PREFIX}:padded`)
    expect(cache.set).not.toHaveBeenCalled()
  })

  it('writes through to cache on miss', async () => {
    const responseBody = `${PASSWORD_SHA1_SUFFIX}:7`
    const cache: BreachCheckCache = {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn(),
    }

    const fetchMock = vi.fn().mockResolvedValue(buildResponse(responseBody))

    await checkPassword('password', { fetch: fetchMock, cache, cacheTtlMs: 30_000 })

    expect(cache.set).toHaveBeenCalledWith(
      `breach-check:${PASSWORD_SHA1_PREFIX}:padded`,
      responseBody,
      30_000,
    )
  })

  it('uses distinct cache keys for padded vs unpadded modes', async () => {
    const cache: BreachCheckCache = {
      get: vi.fn().mockResolvedValue(undefined),
      set: vi.fn(),
    }
    const fetchMock = vi.fn(() => Promise.resolve(buildResponse('')))

    await checkPassword('password', { fetch: fetchMock, cache, padding: true })
    await checkPassword('password', { fetch: fetchMock, cache, padding: false })

    expect(cache.get).toHaveBeenNthCalledWith(1, `breach-check:${PASSWORD_SHA1_PREFIX}:padded`)
    expect(cache.get).toHaveBeenNthCalledWith(2, `breach-check:${PASSWORD_SHA1_PREFIX}:plain`)
  })

  it('aborts the request when timeout elapses', async () => {
    const fetchMock = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'))
          })
        }),
    )

    await expect(
      checkPassword('password', {
        fetch: fetchMock as unknown as typeof globalThis.fetch,
        timeoutMs: 5,
      }),
    ).rejects.toThrow(/aborted/)
  })
})
