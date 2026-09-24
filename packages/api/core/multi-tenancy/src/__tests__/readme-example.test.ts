/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the example's router is mounted on a
 * real Express app over HTTP with the real schema bond. Only the outside world
 * is stood in for — authentication (a test middleware setting `req.user`) and
 * the `@molecule/api-database` DataStore (an in-memory `projects` table).
 *
 * @module
 */
import type { AddressInfo } from 'node:net'

import express from 'express'
import { describe, expect, it, vi } from 'vitest'

interface Where {
  field: string
  value: unknown
}

const { projects } = vi.hoisted(() => ({
  projects: [] as { id: string; tenantId: string; name: string }[],
}))

vi.mock('@molecule/api-database', () => ({
  findMany: vi.fn(async (_table: string, options: { where?: Where[] } = {}) =>
    projects.filter((row) =>
      (options.where ?? []).every((w) => row[w.field as keyof typeof row] === w.value),
    ),
  ),
}))

import { findMany } from '@molecule/api-database'
import { createProvider } from '@molecule/api-multi-tenancy-schema'

import { createTenant, getTenant, getTenantMiddleware, setProvider } from '../index.js'

describe('README @example', () => {
  it('scopes requests to an authorized tenant and rejects spoofed tenant headers', async () => {
    setProvider(
      createProvider({
        resolveAuthorizedTenantIds: (req) => {
          const user = req.user as { tenantIds?: string[] } | undefined
          return user?.tenantIds ?? []
        },
      }),
    )

    const acme = await createTenant({ name: 'Acme Corp' })
    const globex = await createTenant({ name: 'Globex' })
    projects.push(
      { id: 'p1', tenantId: acme.id, name: 'Acme launch' },
      { id: 'p2', tenantId: globex.id, name: 'Globex secret' },
    )

    const router = express.Router()
    router.use(getTenantMiddleware() as unknown as express.RequestHandler)
    router.get('/projects', async (_req, res) => {
      const tenantId = getTenant()
      const projectsForTenant = await findMany('projects', {
        where: [{ field: 'tenantId', operator: '=', value: tenantId }],
      })
      res.json({ tenantId, projects: projectsForTenant })
    })

    const app = express()
    // Stand-in for the app's auth middleware: the signed-in user belongs to Acme only.
    app.use((req, _res, next) => {
      Object.assign(req, { user: { id: 'u_1', tenantIds: [acme.id] } })
      next()
    })
    app.use('/api', router)

    const server = app.listen(0)
    try {
      const { port } = server.address() as AddressInfo
      const url = `http://127.0.0.1:${port}/api/projects`

      const ok = await fetch(url, { headers: { 'x-tenant-id': acme.id } })
      expect(ok.status).toBe(200)
      expect(await ok.json()).toEqual({
        tenantId: acme.id,
        projects: [{ id: 'p1', tenantId: acme.id, name: 'Acme launch' }],
      })

      const spoofed = await fetch(url, { headers: { 'x-tenant-id': globex.id } })
      expect(spoofed.status).toBe(403)

      const missing = await fetch(url)
      expect(missing.status).toBe(400)
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
    }
  })
})
