/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — the HTTP check probes a real local
 * server standing in for the upstream API.
 *
 * @module
 */
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createCustomCheck,
  createHttpCheck,
  getProvider,
  runAll,
  setProvider,
} from '@molecule/api-monitoring'

import { createProvider } from '../index.js'

describe('README @example', () => {
  const originalUrl = process.env.PAYMENTS_HEALTH_URL
  let upstreamStatus = 200
  let server: Server

  beforeAll(async () => {
    server = createServer((_req, res) => {
      res.statusCode = upstreamStatus
      res.end('ok')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    process.env.PAYMENTS_HEALTH_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/health`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    if (originalUrl === undefined) delete process.env.PAYMENTS_HEALTH_URL
    else process.env.PAYMENTS_HEALTH_URL = originalUrl
  })

  it('registers checks on the bonded provider and aggregates them via runAll()', async () => {
    setProvider(createProvider({ checkTimeoutMs: 5000 }))
    const monitoring = getProvider()
    monitoring.register(
      createHttpCheck(process.env.PAYMENTS_HEALTH_URL ?? 'https://payments.example.com/health', {
        name: 'payments-api',
        degradedThresholdMs: 1000,
      }),
    )
    const queueBacklog = async (): Promise<number> => 12
    monitoring.register(
      createCustomCheck('job-queue', async () => {
        const waiting = await queueBacklog()
        return waiting > 1000
          ? { status: 'degraded', message: `${waiting} jobs waiting` }
          : { status: 'operational' }
      }),
    )

    const health = await runAll()
    const httpStatus = health.status === 'down' ? 503 : 200
    expect(httpStatus).toBe(200)
    expect(health.status).toBe('operational')
    expect(health.checks['payments-api']).toMatchObject({
      name: 'payments-api',
      category: 'external',
      status: 'operational',
    })
    expect(typeof health.checks['payments-api']?.latencyMs).toBe('number')
    expect(health.checks['job-queue']).toMatchObject({ status: 'operational', category: 'custom' })

    // Upstream starts failing → that check is down, the whole system is down, runAll still resolves.
    upstreamStatus = 500
    const failing = await runAll()
    expect(failing.status).toBe('down')
    expect(failing.checks['payments-api']).toMatchObject({
      status: 'down',
      message: 'HTTP 500 response.',
    })
    expect(failing.status === 'down' ? 503 : 200).toBe(503)
  })
})
