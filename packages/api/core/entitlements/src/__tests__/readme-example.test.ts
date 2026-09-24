/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the example's router is mounted on a
 * real Express app over HTTP, with the real SQLite DataStore bond (temp file)
 * holding `users.planKey` and `posts`. Only authentication — the outside world
 * the example says to mount it behind — is stood in for by a test middleware.
 *
 * @module
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { count, create, setStore } from '@molecule/api-database'
import { createMigrator, pool, store } from '@molecule/api-database-sqlite'

import {
  clearPlanCache,
  defineTiers,
  enforceLimit,
  requireCategoryAtLeast,
  setProvider,
} from '../index.js'

interface BlogLimits {
  maxPosts: number
}

describe('README @example', () => {
  const originalPath = process.env.SQLITE_PATH
  let root = ''

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'entitlements-readme-'))
    await mkdir(join(root, 'migrations'))
    await writeFile(
      join(root, 'migrations/001_blog.sql'),
      `CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY,
        "planKey" text,
        "planExpiresAt" text
      );
      CREATE TABLE IF NOT EXISTS "posts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "title" text NOT NULL
      );`,
    )
    process.env.SQLITE_PATH = join(root, 'data/app.db')
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    await createMigrator(join(root, 'migrations'))()
    setStore(store)
    await create('users', { id: 'u-free', planKey: 'free' })
    await create('users', { id: 'u-pro', planKey: 'stripeMonthly' })
    clearPlanCache()
  })

  afterAll(async () => {
    await pool.end()
    if (originalPath === undefined) delete process.env.SQLITE_PATH
    else process.env.SQLITE_PATH = originalPath
    vi.restoreAllMocks()
    await rm(root, { recursive: true, force: true })
  })

  it('caps a free user at maxPosts and gates /analytics to pro', async () => {
    setProvider(
      defineTiers<BlogLimits>({
        tiers: {
          free: { planKey: 'free', category: 'free', name: 'Free', limits: { maxPosts: 2 } },
          stripeMonthly: {
            planKey: 'stripeMonthly',
            category: 'pro',
            name: 'Pro',
            limits: { maxPosts: 100 },
          },
        },
        defaultPlanKey: 'free',
        categoryOrder: ['free', 'pro'],
      }),
    )

    const router = express.Router()
    router.post(
      '/posts',
      express.json(),
      enforceLimit<BlogLimits>({
        limitType: 'maxPosts',
        getLimit: (limits) => limits.maxPosts,
        getCurrent: (userId) => count('posts', [{ field: 'userId', operator: '=', value: userId }]),
      }),
      async (req, res) => {
        const userId = res.locals.session?.userId
        if (!userId) {
          res.status(401).end()
          return
        }
        const { data } = await create('posts', { userId, title: String(req.body.title) })
        res.status(201).json(data)
      },
    )
    router.get('/analytics', requireCategoryAtLeast('pro'), (_req, res) => {
      res.json({ views: 42 })
    })

    // Test stand-in for the app's auth middleware (a real app verifies a JWT here).
    const app = express()
    app.use((req, res, next) => {
      const userId = req.header('x-test-user')
      if (userId) res.locals.session = { userId }
      next()
    })
    app.use(router)

    const server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', () => resolve()))
    const { port } = server.address() as AddressInfo
    const call = (method: string, path: string, user?: string): Promise<Response> =>
      fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(user ? { 'x-test-user': user } : {}),
        },
        ...(method === 'POST' ? { body: JSON.stringify({ title: 'Hello' }) } : {}),
      })

    try {
      expect((await call('POST', '/posts', 'u-free')).status).toBe(201)
      expect((await call('POST', '/posts', 'u-free')).status).toBe(201)
      const blocked = await call('POST', '/posts', 'u-free')
      expect(blocked.status).toBe(403)
      expect(await blocked.json()).toMatchObject({
        limitType: 'maxPosts',
        currentLimit: 2,
        upgradedLimit: 100,
        currentTier: 'free',
      })
      expect(await count('posts', [{ field: 'userId', operator: '=', value: 'u-free' }])).toBe(2)

      expect((await call('POST', '/posts', 'u-pro')).status).toBe(201)
      expect((await call('POST', '/posts')).status).toBe(401)

      expect((await call('GET', '/analytics', 'u-free')).status).toBe(403)
      const analytics = await call('GET', '/analytics', 'u-pro')
      expect(analytics.status).toBe(200)
      expect(await analytics.json()).toEqual({ views: 42 })
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
