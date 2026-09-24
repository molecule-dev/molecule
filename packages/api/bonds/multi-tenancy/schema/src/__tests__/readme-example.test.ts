/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — a real express app exercised over
 * real HTTP (port 0).
 *
 * @module
 */
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  createTenant,
  getTenant,
  getTenantMiddleware,
  setProvider,
  type Tenant,
} from '@molecule/api-multi-tenancy'

import { createProvider } from '../index.js'

describe('README @example', () => {
  let server: Server
  let base = ''
  let acme: Tenant
  let globex: Tenant

  beforeAll(async () => {
    setProvider(
      createProvider({
        resolveAuthorizedTenantIds: (req) => {
          const user = req.user as { tenantIds?: string[] } | undefined
          return user?.tenantIds ?? []
        },
      }),
    )

    acme = await createTenant({ name: 'Acme Corp' })
    globex = await createTenant({ name: 'Globex' })
    const projects = [
      { tenantId: acme.id, name: 'Rocket' },
      { tenantId: globex.id, name: 'Widget' },
    ]

    const app = express()
    app.use((req, _res, next) => {
      Object.assign(req, { user: { id: 'u_1', tenantIds: [acme.id] } })
      next()
    })
    app.use(getTenantMiddleware() as unknown as express.RequestHandler)

    app.get('/api/projects', (_req, res) => {
      const tenantId = getTenant()
      res.json(projects.filter((project) => project.tenantId === tenantId))
    })

    server = await new Promise<Server>((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
    })
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it("returns only the member tenant's rows", async () => {
    const res = await fetch(`${base}/api/projects`, { headers: { 'x-tenant-id': acme.id } })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ tenantId: acme.id, name: 'Rocket' }])
  })

  it('403s a tenant the user is not a member of', async () => {
    const res = await fetch(`${base}/api/projects`, { headers: { 'x-tenant-id': globex.id } })
    expect(res.status).toBe(403)
  })

  it('400s a request with no tenant header', async () => {
    const res = await fetch(`${base}/api/projects`)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Missing required header: x-tenant-id' })
  })
})
