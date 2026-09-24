/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — a real Express app with the memory
 * bond, driven over real HTTP (no mocks).
 *
 * @module
 */
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { provider as memoryRateLimit } from '@molecule/api-rate-limit-memory'

import { consume, createRateLimitMiddleware, setProvider } from '../index.js'

describe('README @example', () => {
  let server: Server
  let baseUrl = ''

  beforeAll(async () => {
    setProvider(memoryRateLimit)

    const app = express()
    app.set('trust proxy', 1)
    app.use(createRateLimitMiddleware({ windowMs: 60_000, max: 100 }))

    app.post('/login', express.json(), async (req, res) => {
      const email = String(req.body?.email ?? '').toLowerCase()
      const attempt = await consume(`login:${email}`, 10)
      if (!attempt.allowed) {
        res.set('Retry-After', String(attempt.retryAfter ?? 60))
        res.status(429).json({ retryAfter: attempt.retryAfter })
        return
      }
      res.json({ remaining: attempt.remaining })
    })

    server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', () => resolve()))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  })

  const login = (email: string): Promise<Response> =>
    fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    })

  it('sets RateLimit headers app-wide and blocks the 11th login attempt for one email', async () => {
    const first = await login('Ada@Example.com')
    expect(first.status).toBe(200)
    expect(first.headers.get('ratelimit-limit')).toBe('100')
    expect(await first.json()).toEqual({ remaining: 90 })

    for (let i = 0; i < 9; i++) {
      expect((await login('ada@example.com')).status).toBe(200)
    }

    const blocked = await login('ada@example.com')
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)

    // A different identifier still has its own budget.
    expect((await login('grace@example.com')).status).toBe(200)
  })
})
