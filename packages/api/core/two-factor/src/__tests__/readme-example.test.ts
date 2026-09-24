/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — the real otplib bond behind a real
 * Express router, driven over real HTTP with REAL TOTP codes (no mocks).
 *
 * @module
 */
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { generate } from 'otplib'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { logger } from '@molecule/api-logger'
import { provider } from '@molecule/api-two-factor-otplib'

import { generateSecret, getUrls, setProvider, verify } from '../index.js'

interface TwoFactorRecord {
  secret: string
  enabled: boolean
  lastTimeStep?: number
}

describe('README @example', () => {
  const twoFactorStore = new Map<string, TwoFactorRecord>()
  let server: Server
  let baseUrl = ''

  beforeAll(async () => {
    setProvider(provider)

    const router = express.Router()
    router.use(express.json())

    router.get('/status', (_req, res) => {
      const record = twoFactorStore.get(String(res.locals.userId))
      res.json({ enabled: record?.enabled ?? false })
    })

    router.post('/setup', async (_req, res) => {
      const secret = generateSecret()
      twoFactorStore.set(String(res.locals.userId), { secret, enabled: false })
      const urls = await getUrls({ username: String(res.locals.email), service: 'MyApp', secret })
      res.json({ keyUrl: urls.keyUrl, QRImageUrl: urls.QRImageUrl })
    })

    router.post('/enable', async (req, res) => {
      const userId = String(res.locals.userId)
      const record = twoFactorStore.get(userId)
      if (!record) return void res.status(400).json({ error: 'Run setup first' })
      try {
        const result = await verify({
          secret: record.secret,
          token: String(req.body.token ?? ''),
          afterTimeStep: record.lastTimeStep,
        })
        if (!result.valid) {
          const used = result.reason === 'replay'
          return void res.status(400).json({ error: used ? 'Code already used' : 'Invalid code' })
        }
        twoFactorStore.set(userId, { ...record, enabled: true, lastTimeStep: result.timeStep })
        res.json({ enabled: true })
      } catch (error) {
        logger.error('2FA verify failed: stored secret unusable', { error, userId })
        res.status(500).json({ error: 'Two-factor setup is corrupted — please re-run setup' })
      }
    })

    const app = express()
    // Stands in for the app's auth middleware.
    app.use((_req, res, next) => {
      res.locals.userId = 'user-1'
      res.locals.email = 'ada@example.com'
      next()
    })
    app.use('/2fa', router)

    server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', () => resolve()))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/2fa`
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  })

  const post = (path: string, body: unknown = {}): Promise<Response> =>
    fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })

  it('sets up, rejects a wrong code, enables with a real code, and blocks its replay', async () => {
    expect(await (await fetch(`${baseUrl}/status`)).json()).toEqual({ enabled: false })

    const setup = await post('/setup')
    const urls = (await setup.json()) as { keyUrl: string; QRImageUrl: string }
    expect(urls.keyUrl).toMatch(/^otpauth:\/\/totp\/MyApp:ada%40example\.com\?/)
    expect(urls.QRImageUrl).toMatch(/^data:image\/png;base64,/)
    expect(JSON.stringify(urls)).not.toContain('"secret"')

    const wrong = await post('/enable', { token: '000000' })
    expect(wrong.status).toBe(400)
    expect(await wrong.json()).toEqual({ error: 'Invalid code' })

    const record = twoFactorStore.get('user-1')
    if (!record) throw new Error('setup did not store a pending record')
    const code = await generate({ secret: record.secret })

    const enabled = await post('/enable', { token: code })
    expect(enabled.status).toBe(200)
    expect(await enabled.json()).toEqual({ enabled: true })
    expect(await (await fetch(`${baseUrl}/status`)).json()).toEqual({ enabled: true })

    const replay = await post('/enable', { token: code })
    expect(replay.status).toBe(400)
    expect(await replay.json()).toEqual({ error: 'Code already used' })
  })
})
