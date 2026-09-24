/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — a real express app with the real
 * cookie-parser, exercised over real HTTP (port 0).
 *
 * @module
 */
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createCookieParserMiddleware,
  setCookieParser,
  setCookieParserFactory,
} from '@molecule/api-middleware-cookie-parser'

import { cookieParserFactory, provider } from '../index.js'

describe('README @example', () => {
  const originalSecret = process.env.SESSION_SECRET
  let server: Server
  let base = ''

  beforeAll(async () => {
    process.env.SESSION_SECRET = 'test-session-secret'

    setCookieParser(provider)
    setCookieParserFactory(cookieParserFactory)

    const app = express()
    app.use(createCookieParserMiddleware(process.env.SESSION_SECRET))

    app.post('/api/login', (req, res) => {
      res.cookie('session', 'u_123', {
        signed: true,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      })
      res.json({ ok: true })
    })

    app.get('/api/me', (req, res) => {
      const userId = req.signedCookies.session
      res.json({ userId: userId || null, theme: req.cookies.theme ?? 'light' })
    })

    server = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    if (originalSecret === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = originalSecret
  })

  it('sets a signed session cookie and reads signed + unsigned cookies back', async () => {
    const login = await fetch(`${base}/api/login`, { method: 'POST' })
    const setCookie = login.headers.get('set-cookie') ?? ''
    expect(setCookie).toMatch(/^session=s%3Au_123\./)
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Secure')
    expect(setCookie).toContain('SameSite=Lax')
    const sessionCookie = setCookie.split(';')[0] ?? ''

    const me = await fetch(`${base}/api/me`, {
      headers: { cookie: `${sessionCookie}; theme=dark` },
    })
    expect(await me.json()).toEqual({ userId: 'u_123', theme: 'dark' })

    const tampered = await fetch(`${base}/api/me`, {
      headers: { cookie: sessionCookie.replace('u_123', 'u_999') },
    })
    expect(await tampered.json()).toEqual({ userId: null, theme: 'light' })
  })
})
