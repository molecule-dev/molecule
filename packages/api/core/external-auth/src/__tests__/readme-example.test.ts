/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: a real Express route verifies tokens
 * through the Supabase bond over real HTTP. Only the Supabase SDK
 * (`@supabase/supabase-js` `createClient`) is mocked, the same way the bond's
 * own tests do.
 *
 * @module
 */
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provider as supabaseAuth } from '@molecule/api-external-auth-supabase'

import { setProvider, verifyUserToken } from '../index.js'

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }))

vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }))

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_ANON_KEY', 'test-key')
    createClientMock.mockImplementation(() => ({
      auth: {
        getUser: vi.fn(async (token: string) =>
          token === 'valid-session-token'
            ? { data: { user: { id: 'sb-user-1', email: 'ada@example.com' } }, error: null }
            : { data: { user: null }, error: { message: 'invalid JWT' } },
        ),
      },
    }))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns the verified user for a valid token and 401 for a bad or missing one', async () => {
    setProvider(supabaseAuth)

    const app = express()
    app.get('/api/me', async (req, res) => {
      const token = req.headers.authorization?.replace(/^Bearer /, '') ?? ''
      const user = await verifyUserToken(token)
      if (!user) {
        res.status(401).json({ error: 'Invalid or expired session.' })
        return
      }
      res.json({ userId: user.userId, email: user.email })
    })

    const server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', () => resolve()))
    const { port } = server.address() as AddressInfo
    const me = (authorization?: string): Promise<Response> =>
      fetch(`http://127.0.0.1:${port}/api/me`, {
        headers: authorization ? { authorization } : {},
      })

    try {
      const ok = await me('Bearer valid-session-token')
      expect(ok.status).toBe(200)
      expect(await ok.json()).toEqual({ userId: 'sb-user-1', email: 'ada@example.com' })

      expect((await me('Bearer forged-token')).status).toBe(401)
      expect((await me()).status).toBe(401)
      expect(createClientMock).toHaveBeenCalledWith(
        'https://project.supabase.co',
        'test-key',
        expect.anything(),
      )
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
