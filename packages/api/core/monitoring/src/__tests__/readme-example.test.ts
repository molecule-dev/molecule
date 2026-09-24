/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the default monitoring bond.
 * The outside world is replaced at its boundaries only: the database pool is
 * a scripted `DatabasePool` (the DB driver), the cache is the real in-memory
 * bond, and `fetch` (the probed upstream) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setProvider as setCacheProvider } from '@molecule/api-cache'
import { createProvider as createMemoryCache } from '@molecule/api-cache-memory'
import type { DatabasePool } from '@molecule/api-database'
import { setPool } from '@molecule/api-database'
import { createProvider } from '@molecule/api-monitoring-default'

import {
  createCacheCheck,
  createCustomCheck,
  createDatabaseCheck,
  createHttpCheck,
  getProvider,
  runAll,
  setProvider,
} from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bonds the default provider, runs every check and maps the worst status', async () => {
    const query = vi.fn(async () => ({ rows: [{ '?column?': 1 }], rowCount: 1 }))
    setPool({ query, connect: vi.fn() } as unknown as DatabasePool)
    setCacheProvider(createMemoryCache({ cleanupInterval: 0 }))
    const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ checkTimeoutMs: 5000 }))
    const monitoring = getProvider()
    monitoring.register(createDatabaseCheck())
    monitoring.register(createCacheCheck())
    monitoring.register(
      createHttpCheck('https://api.example.com/health', {
        name: 'upstream-api',
        degradedThresholdMs: 1000,
      }),
    )
    monitoring.register(
      createCustomCheck('disk', async () => ({ status: 'operational', message: 'ok' })),
    )

    const health = await runAll()
    const httpStatus = health.status === 'down' ? 503 : 200

    expect(health.status).toBe('operational')
    expect(httpStatus).toBe(200)
    expect(Object.keys(health.checks).sort()).toEqual(['cache', 'database', 'disk', 'upstream-api'])
    expect(health.checks.database).toMatchObject({
      status: 'operational',
      category: 'infrastructure',
    })
    expect(query).toHaveBeenCalledWith('SELECT 1')
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/health', expect.anything())

    // An upstream outage makes the whole system `down` → 503, without throwing.
    fetchMock.mockResolvedValueOnce(new Response('bad gateway', { status: 502 }))
    const outage = await runAll()
    expect(outage.status).toBe('down')
    expect(outage.checks['upstream-api']?.status).toBe('down')
    expect(outage.status === 'down' ? 503 : 200).toBe(503)
  })
})
