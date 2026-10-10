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

  it('still reports the response status to onError when the body cannot be cancelled', async () => {
    // The cancel rejection must be SWALLOWED, so the observer is told about the
    // 429 — the reason the response was discarded. Counting the calls is not
    // enough: a propagated cancel failure reaches the same single onError call,
    // so only the reported error distinguishes the two behaviours.
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
    expect((onError.mock.calls[0][0] as Error).message).toContain('429')
  })

  it('resolves when the response carries no body at all, reporting nothing', async () => {
    // `emit()` never throws, so "it resolved" is true of ANY internal behaviour
    // — including the no-body branch crashing into the outer catch. An error
    // observer is the only spy that can tell a no-op from a swallowed failure:
    // with `response.body.cancel()` (the optional chaining dropped) this branch
    // throws a TypeError and lands in `onError`, and the assertion below fails.
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 204,
      body: null,
    })) as unknown as typeof fetch
    const onError = vi.fn()
    const provider = createHttpAnalyticsProvider({
      url: 'https://telemetry.example/ingest',
      onError,
    })

    await expect(provider.group?.('g')).resolves.toBeUndefined()

    expect(onError).not.toHaveBeenCalled()
  })
})
