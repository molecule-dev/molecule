vi.mock('@molecule/app-i18n', () => ({
  t: vi.fn((_key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
    let text = opts?.defaultValue ?? _key
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        text = text.replaceAll(`{{${k}}}`, String(v))
      }
    }
    return text
  }),
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, HttpStatusDashboardProvider } from '../provider.js'

describe('@molecule/app-status-dashboard-http', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  const defaultConfig = {
    apiBaseUrl: 'http://localhost:3000',
  }

  const mockSystemStatus = {
    status: 'operational',
    services: [{ id: 'svc-1', name: 'API', url: 'https://api.example.com', status: 'operational' }],
    activeIncidents: [],
    lastUpdated: '2026-01-01T00:00:00Z',
  }

  describe('fetchStatus', () => {
    it('should fetch system status from /status endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSystemStatus),
      })

      const provider = new HttpStatusDashboardProvider({ baseUrl: 'http://localhost:3000' })
      const result = await provider.fetchStatus({})

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/status',
        expect.objectContaining({ headers: expect.any(Object) }),
      )
      expect(result).toEqual(mockSystemStatus)
    })

    it('should use config.apiBaseUrl over provider baseUrl', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSystemStatus),
      })

      const provider = new HttpStatusDashboardProvider({ baseUrl: 'http://fallback:3000' })
      await provider.fetchStatus({ apiBaseUrl: 'http://primary:4000' })

      expect(mockFetch).toHaveBeenCalledWith('http://primary:4000/status', expect.any(Object))
    })

    it('should merge headers from both provider and config', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSystemStatus),
      })

      const provider = new HttpStatusDashboardProvider({
        headers: { Authorization: 'Bearer token' },
      })
      await provider.fetchStatus({ headers: { 'X-Custom': 'value' } })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token',
            'X-Custom': 'value',
          }),
        }),
      )
    })

    it('should throw an error for non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
      })

      const provider = new HttpStatusDashboardProvider()
      await expect(provider.fetchStatus(defaultConfig)).rejects.toThrow(
        'Failed to fetch status: HTTP 503',
      )
    })

    it('should default to empty string base URL when none provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSystemStatus),
      })

      const provider = new HttpStatusDashboardProvider()
      await provider.fetchStatus({})

      expect(mockFetch).toHaveBeenCalledWith('/status', expect.any(Object))
    })
  })

  describe('fetchIncidents', () => {
    const mockIncidents = {
      incidents: [
        {
          id: 'inc-1',
          serviceId: 'svc-1',
          title: 'API Degraded',
          severity: 'minor',
          status: 'investigating',
          startedAt: '2026-01-01T00:00:00Z',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    }

    it('should fetch incidents without filters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockIncidents),
      })

      const provider = new HttpStatusDashboardProvider()
      const result = await provider.fetchIncidents(defaultConfig)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/status/incidents',
        expect.any(Object),
      )
      expect(result).toEqual(mockIncidents.incidents)
    })

    it('should include status filter in query string', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockIncidents),
      })

      const provider = new HttpStatusDashboardProvider()
      await provider.fetchIncidents(defaultConfig, { status: 'investigating' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('status=investigating'),
        expect.any(Object),
      )
    })

    it('should include limit filter in query string', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockIncidents),
      })

      const provider = new HttpStatusDashboardProvider()
      await provider.fetchIncidents(defaultConfig, { limit: 5 })

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('limit=5'), expect.any(Object))
    })

    it('should return empty array for non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      const provider = new HttpStatusDashboardProvider()
      const result = await provider.fetchIncidents(defaultConfig)

      expect(result).toEqual([])
    })

    it('should return empty array when response has no incidents key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      })

      const provider = new HttpStatusDashboardProvider()
      const result = await provider.fetchIncidents(defaultConfig)

      expect(result).toEqual([])
    })
  })

  describe('fetchUptime', () => {
    const mockUptime = {
      uptime: [
        {
          serviceId: 'svc-1',
          serviceName: 'API',
          windows: [
            { window: '24h', uptimePct: 99.9, totalChecks: 288, upChecks: 287, avgLatencyMs: 45 },
          ],
        },
      ],
    }

    it('should fetch uptime without service filter', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockUptime),
      })

      const provider = new HttpStatusDashboardProvider()
      const result = await provider.fetchUptime(defaultConfig)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/status/uptime',
        expect.any(Object),
      )
      expect(result).toEqual(mockUptime.uptime)
    })

    it('should include serviceId in query string', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockUptime),
      })

      const provider = new HttpStatusDashboardProvider()
      await provider.fetchUptime(defaultConfig, 'svc-1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('serviceId=svc-1'),
        expect.any(Object),
      )
    })

    it('should return empty array for non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      const provider = new HttpStatusDashboardProvider()
      const result = await provider.fetchUptime(defaultConfig)

      expect(result).toEqual([])
    })

    it('should return empty array when response has no uptime key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      })

      const provider = new HttpStatusDashboardProvider()
      const result = await provider.fetchUptime(defaultConfig)

      expect(result).toEqual([])
    })
  })

  describe('startPolling', () => {
    it('should fetch immediately when polling starts', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSystemStatus),
      })

      const provider = new HttpStatusDashboardProvider()
      const onUpdate = vi.fn()

      provider.startPolling(defaultConfig, onUpdate)

      // Allow the immediate fetch promise to resolve
      await vi.advanceTimersByTimeAsync(0)

      expect(onUpdate).toHaveBeenCalledWith(mockSystemStatus)
    })

    it('should poll at configured interval', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSystemStatus),
      })

      const provider = new HttpStatusDashboardProvider()
      const onUpdate = vi.fn()

      provider.startPolling({ ...defaultConfig, pollIntervalMs: 5000 }, onUpdate)

      // Clear initial fetch
      await vi.advanceTimersByTimeAsync(0)
      onUpdate.mockClear()

      // Advance past one interval
      await vi.advanceTimersByTimeAsync(5000)

      expect(onUpdate).toHaveBeenCalledTimes(1)
    })

    it('should use default 30s interval when not configured', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSystemStatus),
      })

      const provider = new HttpStatusDashboardProvider()
      const onUpdate = vi.fn()

      provider.startPolling(defaultConfig, onUpdate)

      // Clear initial fetch
      await vi.advanceTimersByTimeAsync(0)
      onUpdate.mockClear()

      // Advance less than 30s — should not poll yet
      await vi.advanceTimersByTimeAsync(29999)
      expect(onUpdate).not.toHaveBeenCalled()

      // Advance to 30s
      await vi.advanceTimersByTimeAsync(1)
      expect(onUpdate).toHaveBeenCalledTimes(1)
    })

    it('should return a stop function that cancels polling', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSystemStatus),
      })

      const provider = new HttpStatusDashboardProvider()
      const onUpdate = vi.fn()

      const stop = provider.startPolling({ ...defaultConfig, pollIntervalMs: 5000 }, onUpdate)

      // Clear initial fetch
      await vi.advanceTimersByTimeAsync(0)
      onUpdate.mockClear()

      stop()

      // Advance past interval — should not fire
      await vi.advanceTimersByTimeAsync(10000)
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it('should silently skip failed polls', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const provider = new HttpStatusDashboardProvider()
      const onUpdate = vi.fn()

      provider.startPolling({ ...defaultConfig, pollIntervalMs: 5000 }, onUpdate)

      // The immediate fetch fails silently
      await vi.advanceTimersByTimeAsync(0)
      expect(onUpdate).not.toHaveBeenCalled()

      // The interval poll also fails silently
      await vi.advanceTimersByTimeAsync(5000)
      expect(onUpdate).not.toHaveBeenCalled()
    })
  })

  describe('stopPolling', () => {
    it('should stop all active polling timers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockSystemStatus),
      })

      const provider = new HttpStatusDashboardProvider()
      const onUpdate1 = vi.fn()
      const onUpdate2 = vi.fn()

      provider.startPolling({ ...defaultConfig, pollIntervalMs: 5000 }, onUpdate1)
      provider.startPolling({ ...defaultConfig, pollIntervalMs: 5000 }, onUpdate2)

      // Clear initial fetches
      await vi.advanceTimersByTimeAsync(0)
      onUpdate1.mockClear()
      onUpdate2.mockClear()

      provider.stopPolling()

      // Advance past interval — neither should fire
      await vi.advanceTimersByTimeAsync(10000)
      expect(onUpdate1).not.toHaveBeenCalled()
      expect(onUpdate2).not.toHaveBeenCalled()
    })

    it('should be safe to call when no polling is active', () => {
      const provider = new HttpStatusDashboardProvider()
      expect(() => provider.stopPolling()).not.toThrow()
    })
  })

  describe('createProvider', () => {
    it('should return an HttpStatusDashboardProvider instance', () => {
      const provider = createProvider()
      expect(provider).toBeInstanceOf(HttpStatusDashboardProvider)
    })

    it('should pass config through', () => {
      const provider = createProvider({ baseUrl: 'http://localhost:5000' })
      expect(provider).toBeInstanceOf(HttpStatusDashboardProvider)
    })
  })
})
