import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TenancyProvider } from '@molecule/api-multi-tenancy'

import { createProvider, runWithTenant } from '../provider.js'

describe('schema-based multi-tenancy provider', () => {
  let provider: TenancyProvider

  beforeEach(() => {
    provider = createProvider()
  })

  describe('setTenant / getTenant (request-scoped)', () => {
    it('should return null when no tenant scope is active', () => {
      expect(provider.getTenant()).toBeNull()
    })

    it('should set and get the current tenant within a scope', () => {
      runWithTenant('placeholder', () => {
        provider.setTenant('tenant-1')
        expect(provider.getTenant()).toBe('tenant-1')
      })
    })

    it('should overwrite the current tenant within a scope', () => {
      runWithTenant('placeholder', () => {
        provider.setTenant('tenant-1')
        provider.setTenant('tenant-2')
        expect(provider.getTenant()).toBe('tenant-2')
      })
    })

    it('should throw when setTenant is called outside a request scope', () => {
      expect(() => provider.setTenant('tenant-1')).toThrow(/outside of a tenant request scope/)
    })

    it('should not leak tenant context outside the scope', () => {
      runWithTenant('placeholder', () => {
        provider.setTenant('tenant-1')
      })

      expect(provider.getTenant()).toBeNull()
    })
  })

  describe('createTenant', () => {
    it('should create a tenant with an auto-generated ID', async () => {
      const tenant = await provider.createTenant({ name: 'Acme Corp' })

      expect(tenant.id).toBeDefined()
      expect(tenant.id.length).toBeGreaterThan(0)
      expect(tenant.name).toBe('Acme Corp')
      expect(tenant.status).toBe('active')
      expect(tenant.createdAt).toBeInstanceOf(Date)
      expect(tenant.updatedAt).toBeInstanceOf(Date)
    })

    it('should store metadata when provided', async () => {
      const tenant = await provider.createTenant({
        name: 'Acme Corp',
        metadata: { plan: 'enterprise', region: 'us-east' },
      })

      expect(tenant.metadata).toEqual({ plan: 'enterprise', region: 'us-east' })
    })

    it('should generate unique IDs for different tenants', async () => {
      const t1 = await provider.createTenant({ name: 'Tenant A' })
      const t2 = await provider.createTenant({ name: 'Tenant B' })

      expect(t1.id).not.toBe(t2.id)
    })

    it('should make tenants available in listTenants', async () => {
      await provider.createTenant({ name: 'Tenant A' })
      await provider.createTenant({ name: 'Tenant B' })

      const tenants = await provider.listTenants()

      expect(tenants).toHaveLength(2)
    })
  })

  describe('deleteTenant', () => {
    it('should delete an existing tenant', async () => {
      const tenant = await provider.createTenant({ name: 'Acme Corp' })

      await provider.deleteTenant(tenant.id)

      const tenants = await provider.listTenants()
      expect(tenants).toHaveLength(0)
    })

    it('should throw when deleting a non-existent tenant', async () => {
      await expect(provider.deleteTenant('non-existent')).rejects.toThrow(
        'Tenant not found: non-existent',
      )
    })

    it('should clear current tenant if the deleted tenant was active', async () => {
      const tenant = await provider.createTenant({ name: 'Acme Corp' })

      await runWithTenant(tenant.id, async () => {
        await provider.deleteTenant(tenant.id)
        expect(provider.getTenant()).toBeNull()
      })
    })

    it('should not clear current tenant if a different tenant was deleted', async () => {
      const t1 = await provider.createTenant({ name: 'Tenant A' })
      const t2 = await provider.createTenant({ name: 'Tenant B' })

      await runWithTenant(t1.id, async () => {
        await provider.deleteTenant(t2.id)
        expect(provider.getTenant()).toBe(t1.id)
      })
    })
  })

  describe('listTenants', () => {
    it('should return empty array when no tenants exist', async () => {
      const tenants = await provider.listTenants()

      expect(tenants).toEqual([])
    })

    it('should return all created tenants', async () => {
      await provider.createTenant({ name: 'Tenant A' })
      await provider.createTenant({ name: 'Tenant B' })
      await provider.createTenant({ name: 'Tenant C' })

      const tenants = await provider.listTenants()

      expect(tenants).toHaveLength(3)
      const names = tenants.map((t) => t.name)
      expect(names).toContain('Tenant A')
      expect(names).toContain('Tenant B')
      expect(names).toContain('Tenant C')
    })
  })

  describe('getTenantMiddleware', () => {
    const mockRes = () => {
      const res: Record<string, unknown> = {}
      res['status'] = vi.fn().mockReturnValue(res)
      res['json'] = vi.fn().mockReturnValue(res)
      return res as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
    }

    it('should scope the request to a known, active tenant from the default header', async () => {
      const tenant = await provider.createTenant({ name: 'Acme Corp' })
      const middleware = provider.getTenantMiddleware()
      let seen: string | null = null
      const next = vi.fn(() => {
        seen = provider.getTenant()
      })
      const req = { headers: { 'x-tenant-id': tenant.id } }
      const res = mockRes()

      await middleware(req, res as never, next)

      expect(seen).toBe(tenant.id)
      expect(next).toHaveBeenCalled()
    })

    it('should return 400 when tenant header is missing', async () => {
      const middleware = provider.getTenantMiddleware()
      const next = vi.fn()
      const req = { headers: {} }
      const res = mockRes()

      await middleware(req, res as never, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required header: x-tenant-id',
      })
      expect(next).not.toHaveBeenCalled()
    })

    it('should return 404 when the header tenant does not exist', async () => {
      const middleware = provider.getTenantMiddleware()
      const next = vi.fn()
      const req = { headers: { 'x-tenant-id': 'ghost-tenant' } }
      const res = mockRes()

      await middleware(req, res as never, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: 'Tenant not found: ghost-tenant' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should use the (trusted) default tenant ID when header is missing', async () => {
      const customProvider = createProvider({ defaultTenantId: 'default-tenant' })
      const middleware = customProvider.getTenantMiddleware()
      let seen: string | null = null
      const next = vi.fn(() => {
        seen = customProvider.getTenant()
      })
      const req = { headers: {} }
      const res = mockRes()

      await middleware(req, res as never, next)

      expect(seen).toBe('default-tenant')
      expect(next).toHaveBeenCalled()
    })

    it('should use a custom header name', async () => {
      const customProvider = createProvider({ tenantHeader: 'x-org-id' })
      const org = await customProvider.createTenant({ name: 'Org 42' })
      const middleware = customProvider.getTenantMiddleware()
      let seen: string | null = null
      const next = vi.fn(() => {
        seen = customProvider.getTenant()
      })
      const req = { headers: { 'x-org-id': org.id } }
      const res = mockRes()

      await middleware(req, res as never, next)

      expect(seen).toBe(org.id)
      expect(next).toHaveBeenCalled()
    })

    it('should handle array header values (first value)', async () => {
      const tenant = await provider.createTenant({ name: 'Acme Corp' })
      const middleware = provider.getTenantMiddleware()
      let seen: string | null = null
      const next = vi.fn(() => {
        seen = provider.getTenant()
      })
      const req = { headers: { 'x-tenant-id': [tenant.id, 'tenant-2'] } }
      const res = mockRes()

      await middleware(req, res as never, next)

      expect(seen).toBe(tenant.id)
      expect(next).toHaveBeenCalled()
    })
  })

  describe('header authorization (anti-spoofing)', () => {
    const mockRes = () => {
      const res: Record<string, unknown> = {}
      res['status'] = vi.fn().mockReturnValue(res)
      res['json'] = vi.fn().mockReturnValue(res)
      return res as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
    }

    it('should reject (403) a header tenant the authenticated principal is NOT a member of', async () => {
      const secureProvider = createProvider({
        resolveAuthorizedTenantIds: (req) => {
          const user = req.user as { tenantIds?: string[] } | undefined
          return user?.tenantIds ?? []
        },
      })
      const victim = await secureProvider.createTenant({ name: 'Victim Inc' })
      const attacker = await secureProvider.createTenant({ name: 'Attacker LLC' })
      const middleware = secureProvider.getTenantMiddleware()
      const next = vi.fn()
      // Attacker is a member of their own tenant but spoofs the victim's header.
      const req = {
        headers: { 'x-tenant-id': victim.id },
        user: { tenantIds: [attacker.id] },
      }
      const res = mockRes()

      await middleware(req, res as never, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: `Not authorized for tenant: ${victim.id}` })
      expect(next).not.toHaveBeenCalled()
    })

    it('should allow a header tenant the authenticated principal IS a member of', async () => {
      const secureProvider = createProvider({
        resolveAuthorizedTenantIds: (req) => {
          const user = req.user as { tenantIds?: string[] } | undefined
          return user?.tenantIds ?? []
        },
      })
      const tenant = await secureProvider.createTenant({ name: 'Acme Corp' })
      const middleware = secureProvider.getTenantMiddleware()
      let seen: string | null = null
      const next = vi.fn(() => {
        seen = secureProvider.getTenant()
      })
      const req = {
        headers: { 'x-tenant-id': tenant.id },
        user: { tenantIds: [tenant.id] },
      }
      const res = mockRes()

      await middleware(req, res as never, next)

      expect(seen).toBe(tenant.id)
      expect(next).toHaveBeenCalled()
    })

    it('should fail closed (call next with error) when the resolver throws', async () => {
      const boom = new Error('auth lookup failed')
      const secureProvider = createProvider({
        resolveAuthorizedTenantIds: () => {
          throw boom
        },
      })
      const tenant = await secureProvider.createTenant({ name: 'Acme Corp' })
      const middleware = secureProvider.getTenantMiddleware()
      const next = vi.fn()
      const req = { headers: { 'x-tenant-id': tenant.id } }
      const res = mockRes()

      await middleware(req, res as never, next)

      expect(next).toHaveBeenCalledWith(boom)
      expect(res.status).not.toHaveBeenCalled()
    })
  })

  describe('cross-request isolation (no tenant bleed under concurrency)', () => {
    it('keeps each in-flight request scoped to its own tenant across awaits', async () => {
      const provider = createProvider()
      const a = await provider.createTenant({ name: 'Tenant A' })
      const b = await provider.createTenant({ name: 'Tenant B' })

      const mockRes = () => {
        const res: Record<string, unknown> = {}
        res['status'] = vi.fn().mockReturnValue(res)
        res['json'] = vi.fn().mockReturnValue(res)
        return res as never
      }

      const seen: Record<string, string | null> = {}

      // Drive a request whose handler awaits a "DB round-trip" during which the
      // other request's middleware runs. With a shared module global, B would
      // overwrite A's tenant before A resumes; with AsyncLocalStorage it cannot.
      const driveRequest = (label: 'A' | 'B', tenantId: string, delayMs: number) =>
        new Promise<void>((resolve, reject) => {
          const middleware = provider.getTenantMiddleware()
          const req = { headers: { 'x-tenant-id': tenantId } }
          middleware(req, mockRes(), async () => {
            try {
              await new Promise((r) => setTimeout(r, delayMs))
              seen[label] = provider.getTenant()
              resolve()
            } catch (error) {
              reject(error)
            }
          })
        })

      await Promise.all([driveRequest('A', a.id, 25), driveRequest('B', b.id, 5)])

      expect(seen['A']).toBe(a.id)
      expect(seen['B']).toBe(b.id)
    })
  })

  describe('configuration', () => {
    it('should work with default configuration', () => {
      expect(() => createProvider()).not.toThrow()
    })

    it('should accept empty config', () => {
      expect(() => createProvider({})).not.toThrow()
    })
  })

  describe('provider export', () => {
    it('should export a lazy provider instance', async () => {
      const { provider: lazyProvider } = await import('../provider.js')

      expect(lazyProvider).toBeDefined()
      expect(typeof lazyProvider.setTenant).toBe('function')
      expect(typeof lazyProvider.getTenant).toBe('function')
      expect(typeof lazyProvider.createTenant).toBe('function')
      expect(typeof lazyProvider.deleteTenant).toBe('function')
      expect(typeof lazyProvider.listTenants).toBe('function')
      expect(typeof lazyProvider.getTenantMiddleware).toBe('function')
    })
  })
})
