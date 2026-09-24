/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — the real HTTP webhook bond behind a
 * real Express router, driven over real HTTP. Only the OUTBOUND delivery
 * (global `fetch`, which the bond's SSRF-guarded client delegates to) is
 * stubbed, since the receiver is on the public internet.
 *
 * @module
 */
import { createHmac } from 'node:crypto'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { isIP } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createProvider, isPrivateAddress } from '@molecule/api-webhook-http'

import { dispatch, register, setProvider } from '../index.js'

describe('README @example', () => {
  const realFetch = globalThis.fetch
  const deliveries: Array<{ url: string; init?: RequestInit }> = []
  let server: Server
  let baseUrl = ''

  beforeAll(async () => {
    vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.startsWith(baseUrl)) return realFetch(input, init)
      deliveries.push({ url, init })
      return new Response(null, { status: 204 })
    })

    setProvider(createProvider({ timeout: 10_000, retryCount: 3, retryDelay: 2000 }))

    const isAllowedWebhookUrl = (raw: string): boolean => {
      if (!URL.canParse(raw)) return false
      const url = new URL(raw)
      const host = url.hostname.replace(/^\[|\]$/g, '')
      const isInternal = host === 'localhost' || (isIP(host) !== 0 && isPrivateAddress(host))
      return url.protocol === 'https:' && !isInternal
    }

    const orderCreatedFor = (userId: string): string => `user.${userId}.order.created`

    const router = express.Router()
    router.post('/webhooks', express.json(), async (req, res) => {
      const url = String(req.body?.url ?? '')
      if (!isAllowedWebhookUrl(url)) return void res.status(400).json({ error: 'URL not allowed' })
      const hook = await register(url, [orderCreatedFor(String(res.locals.userId))])
      res.status(201).json({ id: hook.id, secret: hook.secret })
    })

    const app = express()
    // Stands in for the app's auth middleware.
    app.use((req, res, next) => {
      res.locals.userId = req.get('x-user-id')
      next()
    })
    app.use(router)

    server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', () => resolve()))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    vi.unstubAllGlobals()
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  })

  const registerAs = (userId: string, url: string): Promise<Response> =>
    fetch(`${baseUrl}/webhooks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ url }),
    })

  it('rejects internal destinations and delivers a signed event only to its owner', async () => {
    expect((await registerAs('user-123', 'http://169.254.169.254/latest')).status).toBe(400)
    expect((await registerAs('user-123', 'https://10.0.0.5/hook')).status).toBe(400)
    expect((await registerAs('user-123', 'https://localhost/hook')).status).toBe(400)

    const created = await registerAs('user-123', 'https://hooks.partner.example.com/orders')
    expect(created.status).toBe(201)
    const { secret } = (await created.json()) as { id: string; secret: string }
    expect(secret).toBeTruthy()
    expect((await registerAs('user-456', 'https://hooks.other.example.com/orders')).status).toBe(
      201,
    )

    const orderCreatedFor = (userId: string): string => `user.${userId}.order.created`
    const results = await dispatch(orderCreatedFor('user-123'), { orderId: 'ord_123', total: 4999 })
    const failed = results.filter((result) => !result.success)

    expect(results).toHaveLength(1)
    expect(failed).toEqual([])
    expect(deliveries.map((d) => d.url)).toEqual(['https://hooks.partner.example.com/orders'])
    const body = String(deliveries[0]?.init?.body)
    const headers = deliveries[0]?.init?.headers as Record<string, string>
    expect(headers['x-webhook-signature']).toBe(
      createHmac('sha256', secret).update(body).digest('hex'),
    )
  })
})
