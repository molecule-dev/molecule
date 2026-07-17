/**
 * Request-scoped tenant-context implementation of `TenancyProvider`.
 *
 * Provides three things: (1) a **request-scoped** active-tenant context via
 * `node:async_hooks` `AsyncLocalStorage`, (2) an in-process tenant registry
 * (`createTenant`/`deleteTenant`/`listTenants`, backed by a per-process `Map`),
 * and (3) secure-by-default middleware that resolves the tenant from a
 * configurable HTTP header (`x-tenant-id` by default).
 *
 * **This provider does NO database work.** It creates/selects no schema and
 * scopes no queries — it only tracks *which* tenant the current request belongs
 * to. Enforcing per-tenant DATA isolation is the application's responsibility:
 * read `getTenant()` in your data layer and filter every query by it (e.g. a
 * `tenant_id` column). The package name refers to the intended schema-per-tenant
 * *strategy*; the actual schema DDL / `search_path` scoping is not implemented
 * here — it would require a Postgres-only, request-pinned connection that the
 * DB-agnostic `DataStore` contract does not currently expose.
 *
 * @remarks
 * **Tenant context is request-scoped, never a module global.** The active
 * tenant lives in a `node:async_hooks` `AsyncLocalStorage` store entered by the
 * middleware (`als.run({ tenantId }, next)`), so `getTenant()` always returns
 * the tenant of the *currently executing request* — even across `await`s under
 * heavy concurrency. A shared module-level variable would let request B's
 * tenant bleed into request A while A is awaiting a DB round-trip; this
 * implementation cannot. `setTenant()` mutates the current store and **throws**
 * if called outside a request scope (it can no longer silently establish a
 * process-global tenant). Use {@link runWithTenant} to establish a scope for
 * background jobs / scripts.
 *
 * **The tenant header is attacker-controlled — the middleware does not trust it
 * on its own.** Any authenticated caller can send `x-tenant-id: <victim>`. The
 * middleware therefore (1) authorizes a header tenant against the authenticated
 * principal via `config.resolveAuthorizedTenantIds` (403 on mismatch), and
 * (2) validates the header tenant exists and is `active` (404/403 otherwise)
 * before activating it. **Secure by default ([M5-2]):** when
 * `resolveAuthorizedTenantIds` is **not** configured the middleware REFUSES (403)
 * to honor a header-named tenant at all — set `allowUnauthorizedTenantHeader: true`
 * to opt into the raw-header path, which then MUST be mounted strictly behind your
 * own auth + tenant-membership gate. The server-configured
 * `defaultTenantId` (used only when no header is present) is trusted config and
 * bypasses these checks.
 *
 * @module
 */

import { AsyncLocalStorage } from 'node:async_hooks'

import type {
  CreateTenant,
  TenancyProvider,
  TenancyRequestHandler,
  Tenant,
} from '@molecule/api-multi-tenancy'

import type { SchemaConfig } from './types.js'

/** Default HTTP header for tenant identification. */
const DEFAULT_TENANT_HEADER = 'x-tenant-id'

/** Per-request tenant context store. */
interface TenantContextStore {
  /** The tenant id active for the current request, or `null` when cleared. */
  tenantId: string | null
}

/**
 * Request-scoped storage for the active tenant. Module-level so a single
 * context follows each request's async chain regardless of how many provider
 * instances exist; the store value itself is isolated per async execution
 * context, so concurrent requests never share a tenant.
 */
const tenantContext = new AsyncLocalStorage<TenantContextStore>()

/**
 * Runs `fn` inside a fresh tenant context scope. Use this to establish a tenant
 * for code that runs outside the HTTP middleware (background jobs, scripts,
 * tests) so `getTenant()`/`setTenant()` resolve correctly.
 *
 * @param tenantId - The tenant id to activate for the duration of `fn`.
 * @param fn - The function to run within the tenant scope.
 * @returns Whatever `fn` returns.
 */
export const runWithTenant = <T>(tenantId: string, fn: () => T): T =>
  tenantContext.run({ tenantId }, fn)

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
 * Normalizes a resolver result into a flat list of authorized tenant ids.
 *
 * @param result - The value returned by `resolveAuthorizedTenantIds`.
 * @returns The authorized tenant ids (empty when the principal has none).
 */
const toTenantIdList = (result: string | string[] | null | undefined): string[] => {
  if (result == null) {
    return []
  }
  return Array.isArray(result) ? result : [result]
}

/**
 * Creates a multi-tenancy provider: request-scoped tenant context, an in-process
 * tenant registry, and secure-by-default header-resolution middleware. It
 * performs no database work and does not scope queries — the application must
 * isolate tenant data itself from `getTenant()` (see the module docs).
 *
 * @param config - Provider configuration.
 * @returns A `TenancyProvider` providing request-scoped tenant context (it does
 *   NOT isolate data by itself).
 */
export const createProvider = (config: SchemaConfig = {}): TenancyProvider => {
  const {
    tenantHeader = DEFAULT_TENANT_HEADER,
    defaultTenantId,
    resolveAuthorizedTenantIds,
    allowUnauthorizedTenantHeader = false,
  } = config

  /** In-memory tenant storage. */
  const tenantStore = new Map<string, Tenant>()

  const provider: TenancyProvider = {
    setTenant(tenantId: string): void {
      const store = tenantContext.getStore()
      if (!store) {
        throw new Error(
          'setTenant() called outside of a tenant request scope. Tenant context ' +
            'is request-scoped (AsyncLocalStorage) to prevent cross-request tenant ' +
            'bleed — call it inside getTenantMiddleware() or runWithTenant().',
        )
      }
      store.tenantId = tenantId
    },

    getTenant(): string | null {
      return tenantContext.getStore()?.tenantId ?? null
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

      const store = tenantContext.getStore()
      if (store && store.tenantId === tenantId) {
        store.tenantId = null
      }
    },

    async listTenants(): Promise<Tenant[]> {
      return Array.from(tenantStore.values())
    },

    getTenantMiddleware(): TenancyRequestHandler {
      return async (req, res, next) => {
        const headerValue = req.headers[tenantHeader.toLowerCase()]
        const headerTenantId = Array.isArray(headerValue) ? headerValue[0] : headerValue

        // No header: fall back to the server-configured (trusted) default, or 400.
        if (!headerTenantId) {
          if (defaultTenantId) {
            tenantContext.run({ tenantId: defaultTenantId }, () => next())
            return
          }

          res.status(400).json({
            error: `Missing required header: ${tenantHeader}`,
          })
          return
        }

        // [M5-2] Secure by default: the tenant header is attacker-controlled. Without a
        // resolver to authorize it (and absent the explicit allowUnauthorizedTenantHeader
        // opt-in for integrators who gate membership upstream), refuse to activate a
        // header-named tenant — otherwise any caller could send `x-tenant-id: <victim>` and
        // read/write another tenant's data (cross-tenant IDOR).
        if (!resolveAuthorizedTenantIds && !allowUnauthorizedTenantHeader) {
          res.status(403).json({
            error: `Tenant header '${tenantHeader}' cannot be honored: no tenant authorization is configured.`,
          })
          return
        }

        // The header is attacker-controlled: authorize it against the principal.
        if (resolveAuthorizedTenantIds) {
          let authorized: string[]
          try {
            authorized = toTenantIdList(await resolveAuthorizedTenantIds(req))
          } catch (error) {
            // Fail closed: never activate a tenant when authorization can't be
            // determined. Propagate to the app's error handler (re-throw — not
            // a silent swallow) so the request errors instead of leaking data.
            next(error)
            return
          }

          if (!authorized.includes(headerTenantId)) {
            res.status(403).json({
              error: `Not authorized for tenant: ${headerTenantId}`,
            })
            return
          }
        }

        // The tenant must exist and be active before we scope writes/reads to it.
        const tenant = tenantStore.get(headerTenantId)
        if (!tenant) {
          res.status(404).json({
            error: `Tenant not found: ${headerTenantId}`,
          })
          return
        }
        if (tenant.status !== 'active') {
          res.status(403).json({
            error: `Tenant is not active: ${headerTenantId}`,
          })
          return
        }

        tenantContext.run({ tenantId: headerTenantId }, () => next())
      }
    },
  }

  return provider
}

/** Lazily-initialized default provider instance. */
let _provider: TenancyProvider | null = null

/**
 * Default multi-tenancy provider instance — request-scoped tenant context, an
 * in-process tenant registry, and secure header middleware. Does no database
 * schema work; the application isolates its own data from `getTenant()`.
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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) {
      _provider = createProvider()
    }
    return Reflect.set(_provider, prop, value)
  },
})
