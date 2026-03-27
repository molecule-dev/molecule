import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TenancyProvider } from '@molecule/api-multi-tenancy'

import { createProvider } from '../provider.js'

describe('schema-based multi-tenancy provider', () => {
  let provider: TenancyProvider

  beforeEach(() => {
    provider = createProvider()
  })

  describe('setTenant / getTenant', () => {
    it('should return null when no tenant is set', () => {
      expect(provider.getTenant()).toBeNull()
    })

    it('should set and get the current tenant', () => {
      provider.setTenant('tenant-1')

      expect(provider.getTenant()).toBe('tenant-1')
    })

    it('should overwrite the current tenant', () => {
      provider.setTenant('tenant-1')
      provider.setTenant('tenant-2')

      expect(provider.getTenant()).toBe('tenant-2')
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
      provider.setTenant(tenant.id)

      await provider.deleteTenant(tenant.id)

      expect(provider.getTenant()).toBeNull()
    })

    it('should not clear current tenant if a different tenant was deleted', async () => {
      const t1 = await provider.createTenant({ name: 'Tenant A' })
      const t2 = await provider.createTenant({ name: 'Tenant B' })
      provider.setTenant(t1.id)

      await provider.deleteTenant(t2.id)

      expect(provider.getTenant()).toBe(t1.id)
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

    it('should set tenant from default header', () => {
      const middleware = provider.getTenantMiddleware()
      const next = vi.fn()
      const req = { headers: { 'x-tenant-id': 'tenant-1' } }
      const res = mockRes()

      middleware(req, res as never, next)

      expect(provider.getTenant()).toBe('tenant-1')
      expect(next).toHaveBeenCalled()
    })

    it('should return 400 when tenant header is missing', () => {
      const middleware = provider.getTenantMiddleware()
      const next = vi.fn()
      const req = { headers: {} }
      const res = mockRes()

      middleware(req, res as never, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required header: x-tenant-id',
      })
      expect(next).not.toHaveBeenCalled()
    })

    it('should use default tenant ID when header is missing and default is configured', () => {
      const customProvider = createProvider({ defaultTenantId: 'default-tenant' })
      const middleware = customProvider.getTenantMiddleware()
      const next = vi.fn()
      const req = { headers: {} }
      const res = mockRes()

      middleware(req, res as never, next)

      expect(customProvider.getTenant()).toBe('default-tenant')
      expect(next).toHaveBeenCalled()
    })

    it('should use custom header name', () => {
      const customProvider = createProvider({ tenantHeader: 'x-org-id' })
      const middleware = customProvider.getTenantMiddleware()
      const next = vi.fn()
      const req = { headers: { 'x-org-id': 'org-42' } }
      const res = mockRes()

      middleware(req, res as never, next)

      expect(customProvider.getTenant()).toBe('org-42')
      expect(next).toHaveBeenCalled()
    })

    it('should handle array header values (first value)', () => {
      const middleware = provider.getTenantMiddleware()
      const next = vi.fn()
      const req = { headers: { 'x-tenant-id': ['tenant-1', 'tenant-2'] } }
      const res = mockRes()

      middleware(req, res as never, next)

      expect(provider.getTenant()).toBe('tenant-1')
      expect(next).toHaveBeenCalled()
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
