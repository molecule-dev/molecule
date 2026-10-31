import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../../../auth/src/index.js'
import { getProvider, setProvider, setupAutoTracking } from '../index.js'
import type { AnalyticsEvent } from '../types.js'

const mockProvider = () => ({
  identify: vi.fn().mockResolvedValue(undefined),
  track: vi.fn().mockResolvedValue(undefined),
  page: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn().mockResolvedValue(undefined),
  flush: vi.fn().mockResolvedValue(undefined),
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('analytics credential emission boundary', () => {
  it('redacts a native login rejection from the real auth.error auto-tracking path', async () => {
    const secret = 'analytics-native-userinfo-secret'
    const baseURL = `https://login:${secret}@example.test`
    const native = new TypeError(`Failed to parse URL from ${baseURL}/auth/login`)
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(native)),
    )
    const provider = mockProvider()
    setProvider(provider)
    const client = createJWTAuthClient({ baseURL, autoRefresh: false })
    await client.initialize()
    const stop = setupAutoTracking({ authClient: client })

    const error = await client
      .login({ email: 'alice@example.com', password: 'not-the-fixture-secret' })
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(Error)
    expect(error).not.toBeInstanceOf(TypeError)
    expect((error as Error).name).toBe('TypeError')
    expect(client.getState().error).not.toContain(secret)
    expect(provider.track).toHaveBeenCalledTimes(1)
    const event = provider.track.mock.calls[0][0] as AnalyticsEvent
    expect(event.name).toBe('auth.error')
    expect(JSON.stringify(event)).not.toContain(secret)
    stop()
    client.destroy()
  })

  it('scrubs every direct provider payload while preserving non-secret values byte-for-byte', async () => {
    const provider = mockProvider()
    setProvider(provider)
    const objectSecret = 'analytics-object-secret'
    const urlSecret = 'analytics-url-secret'
    const headerSecret = 'analytics-header-secret'
    const event: AnalyticsEvent = {
      name: 'credential.fixture',
      properties: {
        nested: [{ session_token: objectSecret }],
        requestUrl: `/auth?%74oken=${urlSecret}&view=full`,
        headers: { Authorization: `Bearer ${headerSecret}`, 'X-Request-ID': 'safe-request-id' },
        safePath: '/files/public&token=chapter/part.txt',
        safeText: 'unchanged',
      },
    }

    await getProvider().track(event)

    const emitted = provider.track.mock.calls[0][0] as AnalyticsEvent
    expect(JSON.stringify(emitted)).not.toContain(objectSecret)
    expect(JSON.stringify(emitted)).not.toContain(urlSecret)
    expect(JSON.stringify(emitted)).not.toContain(headerSecret)
    expect(emitted.properties).toMatchObject({
      requestUrl: '/auth?%74oken=[REDACTED]&view=full',
      headers: { 'X-Request-ID': 'safe-request-id' },
      safePath: '/files/public&token=chapter/part.txt',
      safeText: 'unchanged',
    })
  })
})
