/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real HTTP bond with only
 * `fetch` stubbed by an in-memory status API.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/app-status-dashboard-http'

import type { StatusDashboardConfig, SystemStatus } from '../index.js'
import { requireProvider, setProvider } from '../index.js'

const systemStatus: SystemStatus = {
  status: 'degraded',
  services: [
    { id: 's1', name: 'API', url: 'https://api.example.com', status: 'operational' },
    { id: 's2', name: 'Search', url: 'https://search.example.com', status: 'down' },
  ],
  activeIncidents: [],
  lastUpdated: '2026-09-24T12:00:00.000Z',
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches status, incidents and uptime under the bond baseUrl and polls until stopped', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const json = (body: unknown): Response =>
        new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
      if (url === '/api/status') return json(systemStatus)
      if (url === '/api/status/incidents?status=investigating&limit=5') {
        return json({
          incidents: [
            {
              id: 'i1',
              serviceId: 's2',
              title: 'Search latency',
              severity: 'major',
              status: 'investigating',
              startedAt: '2026-09-24T11:50:00.000Z',
              createdAt: '2026-09-24T11:50:00.000Z',
              updatedAt: '2026-09-24T11:55:00.000Z',
            },
          ],
        })
      }
      if (url === '/api/status/uptime') {
        return json({
          uptime: [
            {
              serviceId: 's1',
              serviceName: 'API',
              windows: [
                {
                  window: '30d',
                  uptimePct: 99.95,
                  totalChecks: 100,
                  upChecks: 99,
                  avgLatencyMs: 140,
                },
              ],
            },
          ],
        })
      }
      return new Response('not found', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ baseUrl: '/api' }))

    const dashboard = requireProvider()
    const config: StatusDashboardConfig = { pollIntervalMs: 30_000 }

    const status = await dashboard.fetchStatus(config)
    const down = status.services.filter((service) => service.status === 'down')
    expect(status.status).toBe('degraded')
    expect(down.map((service) => service.name)).toEqual(['Search'])

    const incidents = await dashboard.fetchIncidents(config, { status: 'investigating', limit: 5 })
    const uptime = await dashboard.fetchUptime(config)
    const month = uptime[0]?.windows.find((w) => w.window === '30d')
    expect(incidents[0]?.title).toBe('Search latency')
    expect(month?.uptimePct).toBe(99.95)

    const updates: string[] = []
    const renderStatus = (next: SystemStatus): void => {
      updates.push(next.status)
    }
    const stop = dashboard.startPolling(config, renderStatus)
    await vi.waitFor(() => expect(updates).toEqual(['degraded']))
    stop()

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/status',
      '/api/status/incidents?status=investigating&limit=5',
      '/api/status/uptime',
      '/api/status',
    ])
  })
})
