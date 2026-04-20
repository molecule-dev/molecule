import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { TenancyProvider, TenancyRequestHandler, Tenant } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let setTenant: typeof ProviderModule.setTenant
let getTenant: typeof ProviderModule.getTenant
let createTenant: typeof ProviderModule.createTenant
let deleteTenant: typeof ProviderModule.deleteTenant
let listTenants: typeof ProviderModule.listTenants
let getTenantMiddleware: typeof ProviderModule.getTenantMiddleware

const mockTenant: Tenant = {
  id: 'tenant-1',
  name: 'Acme Corp',
  status: 'active',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const mockMiddleware: TenancyRequestHandler = vi.fn()

const makeMockProvider = (overrides?: Partial<TenancyProvider>): TenancyProvider => ({
  setTenant: vi.fn(),
  getTenant: vi.fn().mockReturnValue('tenant-1'),
  createTenant: vi.fn().mockResolvedValue(mockTenant),
  deleteTenant: vi.fn().mockResolvedValue(undefined),
  listTenants: vi.fn().mockResolvedValue([mockTenant]),
  getTenantMiddleware: vi.fn().mockReturnValue(mockMiddleware),
  ...overrides,
})

describe('multi-tenancy provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    setTenant = providerModule.setTenant
    getTenant = providerModule.getTenant
    createTenant = providerModule.createTenant
    deleteTenant = providerModule.deleteTenant
    listTenants = providerModule.listTenants
    getTenantMiddleware = providerModule.getTenantMiddleware
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Multi-tenancy provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = makeMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      setProvider(makeMockProvider())
      expect(hasProvider()).toBe(true)
    })
  })

  describe('setTenant', () => {
    it('should throw when no provider is set', () => {
      expect(() => setTenant('tenant-1')).toThrow('Multi-tenancy provider not configured')
    })

    it('should delegate to provider setTenant', () => {
      const mockFn = vi.fn()
      setProvider(makeMockProvider({ setTenant: mockFn }))

      setTenant('tenant-1')

      expect(mockFn).toHaveBeenCalledWith('tenant-1')
    })
  })

  describe('getTenant', () => {
    it('should throw when no provider is set', () => {
      expect(() => getTenant()).toThrow('Multi-tenancy provider not configured')
    })

    it('should delegate to provider getTenant', () => {
      const mockFn = vi.fn().mockReturnValue('tenant-1')
      setProvider(makeMockProvider({ getTenant: mockFn }))

      const result = getTenant()

      expect(mockFn).toHaveBeenCalled()
      expect(result).toBe('tenant-1')
    })

    it('should return null when no tenant is set', () => {
      const mockFn = vi.fn().mockReturnValue(null)
      setProvider(makeMockProvider({ getTenant: mockFn }))

      expect(getTenant()).toBeNull()
    })
  })

  describe('createTenant', () => {
    it('should throw when no provider is set', async () => {
      await expect(createTenant({ name: 'Test' })).rejects.toThrow(
        'Multi-tenancy provider not configured',
      )
    })

    it('should delegate to provider createTenant', async () => {
      const mockFn = vi.fn().mockResolvedValue(mockTenant)
      setProvider(makeMockProvider({ createTenant: mockFn }))

      const result = await createTenant({ name: 'Acme Corp' })

      expect(mockFn).toHaveBeenCalledWith({ name: 'Acme Corp' })
      expect(result).toBe(mockTenant)
    })

    it('should pass metadata when provided', async () => {
      const mockFn = vi.fn().mockResolvedValue(mockTenant)
      setProvider(makeMockProvider({ createTenant: mockFn }))

      await createTenant({ name: 'Acme Corp', metadata: { plan: 'pro' } })

      expect(mockFn).toHaveBeenCalledWith({ name: 'Acme Corp', metadata: { plan: 'pro' } })
    })
  })

  describe('deleteTenant', () => {
    it('should throw when no provider is set', async () => {
      await expect(deleteTenant('tenant-1')).rejects.toThrow(
        'Multi-tenancy provider not configured',
      )
    })

    it('should delegate to provider deleteTenant', async () => {
      const mockFn = vi.fn().mockResolvedValue(undefined)
      setProvider(makeMockProvider({ deleteTenant: mockFn }))

      await deleteTenant('tenant-1')

      expect(mockFn).toHaveBeenCalledWith('tenant-1')
    })
  })

  describe('listTenants', () => {
    it('should throw when no provider is set', async () => {
      await expect(listTenants()).rejects.toThrow('Multi-tenancy provider not configured')
    })

    it('should delegate to provider listTenants', async () => {
      const mockFn = vi.fn().mockResolvedValue([mockTenant])
      setProvider(makeMockProvider({ listTenants: mockFn }))

      const result = await listTenants()

      expect(mockFn).toHaveBeenCalled()
      expect(result).toEqual([mockTenant])
    })

    it('should return empty array when no tenants exist', async () => {
      const mockFn = vi.fn().mockResolvedValue([])
      setProvider(makeMockProvider({ listTenants: mockFn }))

      const result = await listTenants()

      expect(result).toEqual([])
    })
  })

  describe('getTenantMiddleware', () => {
    it('should throw when no provider is set', () => {
      expect(() => getTenantMiddleware()).toThrow('Multi-tenancy provider not configured')
    })

    it('should delegate to provider getTenantMiddleware', () => {
      const handler: TenancyRequestHandler = vi.fn()
      const mockFn = vi.fn().mockReturnValue(handler)
      setProvider(makeMockProvider({ getTenantMiddleware: mockFn }))

      const result = getTenantMiddleware()

      expect(mockFn).toHaveBeenCalled()
      expect(result).toBe(handler)
    })
  })
})
