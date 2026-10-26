import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getProvider, hasProvider, probe, setProvider } from '../provider.js'
import type { UptimeProbeResult, UptimeProvider } from '../types.js'

const mockResult: UptimeProbeResult = {
  status: 'operational',
  checkedAt: '2026-10-26T00:00:00.000Z',
  url: 'https://example.com/health',
  method: 'GET',
  httpStatus: 200,
  latencyMs: 42,
}

const mockProvider: UptimeProvider = {
  probe: vi.fn().mockResolvedValue(mockResult),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('uptime core provider bond', () => {
  it('starts unbonded and reports probe unavailable', async () => {
    expect(hasProvider()).toBe(false)
    expect(() => getProvider()).toThrow('setProvider() first')
    await expect(probe({ url: 'https://example.com' })).rejects.toThrow('setProvider() first')
  })

  it('delegates probe to the bonded provider', async () => {
    setProvider(mockProvider)
    const result = await probe({ url: 'https://example.com/health', expectText: 'ok' })
    expect(mockProvider.probe).toHaveBeenCalledWith({
      url: 'https://example.com/health',
      expectText: 'ok',
    })
    expect(result.status).toBe('operational')
    expect(result.latencyMs).toBe(42)
  })
})
