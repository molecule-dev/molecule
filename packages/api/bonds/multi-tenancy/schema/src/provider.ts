/**
 * Schema-based implementation of `TenancyProvider`.
 *
 * Uses in-memory storage for tenant records and context. Each tenant
 * is logically mapped to a database schema via a configurable prefix
 * (`tenant_{id}`). Provides middleware that resolves the tenant from
 * a configurable HTTP header.
 *
 * @module
 */

import type {
  CreateTenant,
  TenancyProvider,
  TenancyRequestHandler,
  Tenant,
} from '@molecule/api-multi-tenancy'

import type { SchemaConfig } from './types.js'

/** Default HTTP header for tenant identification. */
const DEFAULT_TENANT_HEADER = 'x-tenant-id'

/**
 * Generates a unique identifier.
 *
 * @returns A short random identifier suitable for tenant records.
 */
const generateId = (): string => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `${timestamp}-${random}`
}

/**
 * Creates a schema-based multi-tenancy provider.
 *
 * @param config - Provider configuration.
 * @returns A `TenancyProvider` using schema-based tenant isolation.
 */
export const createProvider = (config: SchemaConfig = {}): TenancyProvider => {
  const { tenantHeader = DEFAULT_TENANT_HEADER, defaultTenantId } = config

  /** In-memory tenant storage. */
  const tenantStore = new Map<string, Tenant>()

  /** Current tenant context. */
  let currentTenantId: string | null = null

  const provider: TenancyProvider = {
    setTenant(tenantId: string): void {
      currentTenantId = tenantId
    },

    getTenant(): string | null {
      return currentTenantId
    },

    async createTenant(tenant: CreateTenant): Promise<Tenant> {
      const now = new Date()
      const newTenant: Tenant = {
        id: generateId(),
        name: tenant.name,
        status: 'active',
        metadata: tenant.metadata,
        createdAt: now,
        updatedAt: now,
      }

      tenantStore.set(newTenant.id, newTenant)
      return newTenant
    },

    async deleteTenant(tenantId: string): Promise<void> {
      if (!tenantStore.has(tenantId)) {
        throw new Error(`Tenant not found: ${tenantId}`)
      }

      tenantStore.delete(tenantId)

      if (currentTenantId === tenantId) {
        currentTenantId = null
      }
    },

    async listTenants(): Promise<Tenant[]> {
      return Array.from(tenantStore.values())
    },

    getTenantMiddleware(): TenancyRequestHandler {
      return (req, res, next) => {
        const headerValue = req.headers[tenantHeader.toLowerCase()]
        const tenantId = Array.isArray(headerValue) ? headerValue[0] : headerValue

        if (tenantId) {
          provider.setTenant(tenantId)
          next()
          return
        }

        if (defaultTenantId) {
          provider.setTenant(defaultTenantId)
          next()
          return
        }

        res.status(400).json({
          error: `Missing required header: ${tenantHeader}`,
        })
      }
    },
  }

  return provider
}

/** Lazily-initialized default provider instance. */
let _provider: TenancyProvider | null = null

/**
 * Default schema-based multi-tenancy provider instance.
 *
 * Lazily initializes on first property access with default configuration.
 */
export const provider: TenancyProvider = new Proxy({} as TenancyProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider()
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
