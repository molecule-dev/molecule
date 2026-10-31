import { afterEach, describe, expect, it, vi } from 'vitest'

import { bond, unbond } from '@molecule/app-bond'

import { getProvider, track } from '../index.js'
import type { AnalyticsEvent, AnalyticsProvider } from '../types.js'

afterEach(() => {
  unbond('app-analytics')
  vi.restoreAllMocks()
})

describe('round-five directly bonded analytics provider', () => {
  it('scrubs public track payloads at retrieval and caches the safe wrapper', async () => {
    const provider: AnalyticsProvider & { track: ReturnType<typeof vi.fn> } = {
      identify: vi.fn().mockResolvedValue(undefined),
      track: vi.fn().mockResolvedValue(undefined),
      page: vi.fn().mockResolvedValue(undefined),
    }
    bond('app-analytics', provider)
    const event: AnalyticsEvent = {
      name: 'credential.fixture',
      properties: {
        password: 'direct-analytics-secret',
        requestUrl: '/auth?token=direct-analytics-url-secret&view=full',
        safe: 'byte-for-byte',
      },
    }

    await track(event)

    expect(provider.track).toHaveBeenCalledTimes(1)
    const emitted = provider.track.mock.calls[0][0] as AnalyticsEvent
    expect(JSON.stringify(emitted)).not.toContain('direct-analytics-secret')
    expect(JSON.stringify(emitted)).not.toContain('direct-analytics-url-secret')
    expect(emitted.properties).toMatchObject({
      requestUrl: '/auth?token=[REDACTED]&view=full',
      safe: 'byte-for-byte',
    })
    expect(event.properties?.password).toBe('direct-analytics-secret')
    expect(getProvider()).toBe(getProvider())
  })
})
