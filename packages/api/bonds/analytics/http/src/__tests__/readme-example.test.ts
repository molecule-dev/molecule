/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch`) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { identify, setProvider, track } from '@molecule/api-analytics'

import { createHttpAnalyticsProvider } from '../index.js'

describe('README @example', () => {
  const originalUrl = process.env.MOLECULE_ANALYTICS_URL

  beforeEach(() => {
    process.env.MOLECULE_ANALYTICS_URL = 'https://api.example.com/v1/telemetry'
  })

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.MOLECULE_ANALYTICS_URL
    else process.env.MOLECULE_ANALYTICS_URL = originalUrl
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('POSTs identify and track payloads to the configured endpoint', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(null, { status: 204 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)

    setProvider(
      createHttpAnalyticsProvider({
        url: process.env.MOLECULE_ANALYTICS_URL,
        source: 'my-cli',
        onError: (error) => console.debug('telemetry POST failed', error),
      }),
    )

    await identify({ userId: 'user-123', email: 'ada@example.com' })
    await track({ name: 'project.created', userId: 'user-123', properties: { template: 'blog' } })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [url, init] = fetchMock.mock.calls[1] ?? []
    expect(String(url)).toBe('https://api.example.com/v1/telemetry')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      kind: 'track',
      source: 'my-cli',
      sentAt: expect.any(String),
      event: { name: 'project.created', userId: 'user-123', properties: { template: 'blog' } },
    })
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).kind).toBe('identify')
    expect(debug).not.toHaveBeenCalled()
  })

  it('reports a failing endpoint to onError instead of throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 500 })),
    )
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined)

    setProvider(
      createHttpAnalyticsProvider({
        url: process.env.MOLECULE_ANALYTICS_URL,
        source: 'my-cli',
        onError: (error) => console.debug('telemetry POST failed', error),
      }),
    )

    await expect(track({ name: 'project.created' })).resolves.toBeUndefined()
    expect(debug).toHaveBeenCalledWith('telemetry POST failed', expect.any(Error))
  })
})
