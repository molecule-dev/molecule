import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { ActivityEvent } from '@molecule/api-activity'

const warn = vi.fn()

vi.mock('@molecule/api-logger', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: (...args: unknown[]) => warn(...args),
    error: vi.fn(),
  },
}))

import { createHttpSink } from '../provider.js'

const sampleEvent: ActivityEvent = {
  id: 'event-1',
  type: 'email',
  status: 'captured',
  recipient: 'user@example.com',
  summary: 'Welcome email',
  timestamp: '2026-05-24T00:00:00.000Z',
}

/** The global `fetch` signature, used to type the stub and its recorded calls. */
type FetchSignature = typeof fetch

/**
 * Reads one recorded call from the stubbed `fetch`, narrowed to the URL and init
 * object the sink must send. Throws when the call or its init is missing, so a
 * regression fails the test instead of reading as `undefined`.
 */
function fetchCall(
  fetchMock: Mock<FetchSignature>,
  index = 0,
): [string | URL | Request, RequestInit] {
  const call = fetchMock.mock.calls[index]
  if (!call) {
    throw new Error(`expected fetch call ${index + 1} to be recorded, but it was not`)
  }
  const [url, init] = call
  if (!init) {
    throw new Error(`expected fetch call ${index + 1} to pass an init object`)
  }
  return [url, init]
}

describe('http activity sink', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    delete process.env.MOLECULE_ACTIVITY_URL
    delete process.env.MOLECULE_VAULT_TOKEN
    delete process.env.MOLECULE_APP_ID
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs the event with auth + app id headers and JSON body', async () => {
    const fetchMock = vi.fn<FetchSignature>(() =>
      Promise.resolve(new Response(null, { status: 201 })),
    )
    vi.stubGlobal('fetch', fetchMock)

    const sink = createHttpSink({
      url: 'https://example.test/v1/activity',
      token: 'mvt_abc',
      appId: 'app-123',
    })
    await sink.record(sampleEvent)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchCall(fetchMock)
    const headers = new Headers(init.headers)
    expect(url).toBe('https://example.test/v1/activity')
    expect(init.method).toBe('POST')
    expect(headers.get('Authorization')).toBe('Bearer mvt_abc')
    expect(headers.get('X-Molecule-App-Id')).toBe('app-123')
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(init.body).toBe(JSON.stringify(sampleEvent))
  })

  it('does not phone home when no activity URL is configured', async () => {
    // Even with auth env present, an unconfigured sink must have NO destination.
    process.env.MOLECULE_VAULT_TOKEN = 'mvt_env'
    process.env.MOLECULE_APP_ID = 'app-env'
    const fetchMock = vi.fn<FetchSignature>(() =>
      Promise.resolve(new Response(null, { status: 200 })),
    )
    vi.stubGlobal('fetch', fetchMock)

    const sink = createHttpSink()
    await expect(sink.record(sampleEvent)).resolves.toBeUndefined()

    // A generic HTTP sink must never assume a baked-in endpoint (e.g.
    // molecule.dev) when unconfigured — that would be silent exfiltration.
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reads the endpoint from MOLECULE_VAULT_TOKEN/APP_ID env auth when a URL is set', async () => {
    process.env.MOLECULE_ACTIVITY_URL = 'https://ingest.example.test/v1/activity'
    process.env.MOLECULE_VAULT_TOKEN = 'mvt_env'
    process.env.MOLECULE_APP_ID = 'app-env'
    const fetchMock = vi.fn<FetchSignature>(() =>
      Promise.resolve(new Response(null, { status: 200 })),
    )
    vi.stubGlobal('fetch', fetchMock)

    const sink = createHttpSink()
    await sink.record(sampleEvent)

    const [url, init] = fetchCall(fetchMock)
    const headers = new Headers(init.headers)
    expect(url).toBe('https://ingest.example.test/v1/activity')
    expect(headers.get('Authorization')).toBe('Bearer mvt_env')
    expect(headers.get('X-Molecule-App-Id')).toBe('app-env')
  })

  it('honors MOLECULE_ACTIVITY_URL', async () => {
    process.env.MOLECULE_ACTIVITY_URL = 'https://override.test/activity'
    const fetchMock = vi.fn<FetchSignature>(() =>
      Promise.resolve(new Response(null, { status: 200 })),
    )
    vi.stubGlobal('fetch', fetchMock)

    const sink = createHttpSink()
    await sink.record(sampleEvent)

    const [url] = fetchCall(fetchMock)
    expect(url).toBe('https://override.test/activity')
  })

  it('omits auth header when no token is available', async () => {
    const fetchMock = vi.fn<FetchSignature>(() =>
      Promise.resolve(new Response(null, { status: 200 })),
    )
    vi.stubGlobal('fetch', fetchMock)

    const sink = createHttpSink({ url: 'https://example.test/activity' })
    await sink.record(sampleEvent)

    const [, init] = fetchCall(fetchMock)
    const headers = new Headers(init.headers)
    expect(headers.has('Authorization')).toBe(false)
    expect(headers.has('X-Molecule-App-Id')).toBe(false)
  })

  it('swallows non-ok responses and logs a warning', async () => {
    const fetchMock = vi.fn<FetchSignature>(() =>
      Promise.resolve(new Response('nope', { status: 500, statusText: 'Internal Server Error' })),
    )
    vi.stubGlobal('fetch', fetchMock)

    const sink = createHttpSink({ url: 'https://example.test/activity' })
    await expect(sink.record(sampleEvent)).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('swallows fetch rejections and never throws', async () => {
    const fetchMock = vi.fn<FetchSignature>(() => Promise.reject(new Error('network down')))
    vi.stubGlobal('fetch', fetchMock)

    const sink = createHttpSink({ url: 'https://example.test/activity' })
    await expect(sink.record(sampleEvent)).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(1)
  })
})

describe('secret registration', () => {
  it('registers MOLECULE_ACTIVITY_URL in the @molecule/api-secrets registry', async () => {
    await import('../index.js')
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    expect(getSecretDefinition('MOLECULE_ACTIVITY_URL')).toBeDefined()
  })
})
