/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — a real express app with the real
 * `cors` package, exercised over real HTTP (port 0).
 *
 * @module
 */
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { cors, setCors, setCorsFactory } from '@molecule/api-middleware-cors'

import { corsFactory, provider } from '../index.js'

describe('README @example', () => {
  const originalEnv = process.env
  let server: Server
  let base = ''

  beforeAll(async () => {
    process.env = { ...originalEnv, NODE_ENV: 'production', APP_ORIGIN: 'https://app.example.com' }

    setCors(provider)
    setCorsFactory(corsFactory)

    const app = express()
    app.use(cors)

    app.get('/api/items', (req, res) => {
      res.json([{ id: 1, name: 'Desk' }])
    })

    server = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    process.env = originalEnv
  })

  it('allows the APP_ORIGIN with credentials and exposes the authorization header', async () => {
    const res = await fetch(`${base}/api/items`, {
      headers: { origin: 'https://app.example.com' },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe('https://app.example.com')
    expect(res.headers.get('access-control-allow-credentials')).toBe('true')
    expect(res.headers.get('access-control-expose-headers')).toBe(
      'authorization, set-authorization',
    )
    expect(await res.json()).toEqual([{ id: 1, name: 'Desk' }])
  })

  it('answers the preflight with 204', async () => {
    const res = await fetch(`${base}/api/items`, {
      method: 'OPTIONS',
      headers: {
        origin: 'https://app.example.com',
        'access-control-request-method': 'POST',
      },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('https://app.example.com')
  })

  it('withholds CORS headers from other origins (and from localhost in production)', async () => {
    for (const origin of ['https://evil.example', 'http://localhost:5173']) {
      const res = await fetch(`${base}/api/items`, { headers: { origin } })
      expect(res.status).toBe(200)
      expect(res.headers.get('access-control-allow-origin')).toBeNull()
    }
  })
})
