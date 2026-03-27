/**
 * Type definitions for the multi-tenancy core interface.
 *
 * Defines the `TenancyProvider` interface for multi-tenant data isolation
 * including tenant lifecycle management, context switching, and
 * middleware integration. Bond packages implement this interface to
 * provide concrete tenancy strategies (schema-based, row-based, etc.).
 *
 * @module
 */

/**
 * Status of a tenant.
 */
export type TenantStatus = 'active' | 'suspended' | 'pending' | 'deleted'

/**
 * Configuration options for a tenancy provider.
 */
export interface TenancyConfig {
  /** Default tenant ID to use when none is set in context. */
  defaultTenantId?: string

  /** Whether to enforce tenant isolation strictly (throw on missing tenant). */
  strictMode?: boolean
}

/**
 * Represents a tenant in the system.
 */
export interface Tenant {
  /** Unique tenant identifier. */
  id: string

  /** Human-readable tenant name. */
  name: string

  /** Current status of the tenant. */
  status: TenantStatus

  /** Optional metadata associated with the tenant. */
  metadata?: Record<string, unknown>

  /** When the tenant was created. */
  createdAt: Date

  /** When the tenant was last updated. */
  updatedAt: Date
}

/**
 * Payload for creating a new tenant.
 */
export interface CreateTenant {
  /** Human-readable tenant name. */
  name: string

  /** Optional metadata to associate with the tenant. */
  metadata?: Record<string, unknown>
}

/** Express-compatible request object (minimal shape). */
export interface TenancyRequest {
  /** Request headers. */
  headers: Record<string, string | string[] | undefined>
  [key: string]: unknown
}

/** Express-compatible response object (minimal shape). */
export interface TenancyResponse {
  /** Sets the HTTP status code. */
  status(code: number): TenancyResponse

  /** Sends a JSON response. */
  json(body: unknown): TenancyResponse
  [key: string]: unknown
}

/** Express-compatible next function. */
export type TenancyNextFunction = (err?: unknown) => void

/** Express-compatible request handler for tenant middleware. */
export type TenancyRequestHandler = (
  req: TenancyRequest,
  res: TenancyResponse,
  next: TenancyNextFunction,
) => void | Promise<void>

/**
 * Multi-tenancy provider interface.
 *
 * All tenancy providers must implement this interface to provide
 * tenant lifecycle management, context switching, and middleware
 * integration for multi-tenant data isolation.
 */
export interface TenancyProvider {
  /**
   * Sets the current tenant context. Subsequent operations will
   * be scoped to this tenant until changed.
   *
   * @param tenantId - The tenant identifier to activate.
   */
  setTenant(tenantId: string): void

  /**
   * Retrieves the current tenant identifier, or `null` if no
   * tenant context is active.
   *
   * @returns The current tenant ID or `null`.
   */
  getTenant(): string | null

  /**
   * Creates a new tenant in the system.
   *
   * @param tenant - The tenant creation payload.
   * @returns The created tenant.
   */
  createTenant(tenant: CreateTenant): Promise<Tenant>

  /**
   * Deletes a tenant and all associated data.
   *
   * @param tenantId - The identifier of the tenant to delete.
   */
  deleteTenant(tenantId: string): Promise<void>

  /**
   * Lists all tenants in the system.
   *
   * @returns Array of all tenants.
   */
  listTenants(): Promise<Tenant[]>

  /**
   * Creates an Express-compatible middleware that extracts the
   * tenant identifier from the incoming request (e.g. from a header)
   * and sets the tenant context for the request lifecycle.
   *
   * @returns An Express request handler.
   */
  getTenantMiddleware(): TenancyRequestHandler
}
