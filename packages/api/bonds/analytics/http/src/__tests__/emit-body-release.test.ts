/**
 * The discarded-response-body contract for `emit()`: the HTTP analytics bond
 * never reads a response body, so it must RELEASE it on every path — an
 * unconsumed body strands its connection in the pool until GC reclaims it, and
 * `emit()` runs on every analytics call in a long-lived process, so a dead or
 * misconfigured endpoint would otherwise leak one socket per call forever (the
 * same release the other bonds apply to discarded error-response bodies).
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createHttpAnalyticsProvider } from '../index.js'

describe('emit() releases the response body it never reads', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('cancels the body of a rejected (5xx) response and still reports to onError', async () => {
    const cancel = vi.fn(() => Promise.resolve())
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 503,
      body: { cancel },
    })) as unknown as typeof fetch
    const onError = vi.fn()
    const provider = createHttpAnalyticsProvider({
      url: 'https://telemetry.example/ingest',
      onError,
    })

    // Telemetry never breaks the caller.
    await expect(provider.track({ name: 'x' })).resolves.toBeUndefined()

    expect(cancel).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error)
    expect((onError.mock.calls[0][0] as Error).message).toContain('503')
  })

  it('cancels the body of a 2xx response too (it is never read)', async () => {
    const cancel = vi.fn(() => Promise.resolve())
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 204,
      body: { cancel },
    })) as unknown as typeof fetch
    const onError = vi.fn()
    const provider = createHttpAnalyticsProvider({
      url: 'https://telemetry.example/ingest',
      onError,
    })

    await expect(provider.page({ name: 'p' })).resolves.toBeUndefined()

    expect(cancel).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })

  it('still reports to onError and resolves when the body cannot be cancelled', async () => {
    const cancel = vi.fn(() => Promise.reject(new Error('body already disturbed')))
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 429,
      body: { cancel },
    })) as unknown as typeof fetch
    const onError = vi.fn()
    const provider = createHttpAnalyticsProvider({
      url: 'https://telemetry.example/ingest',
      onError,
    })

    await expect(provider.track({ name: 'x' })).resolves.toBeUndefined()

    expect(cancel).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('resolves when the response carries no body at all', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 204,
      body: null,
    })) as unknown as typeof fetch
    const provider = createHttpAnalyticsProvider({ url: 'https://telemetry.example/ingest' })

    await expect(provider.group?.('g')).resolves.toBeUndefined()
  })
})
