/**
 * Configuration for the multi-tenancy provider (`@molecule/api-multi-tenancy-schema`).
 *
 * @module
 */

import type { TenancyRequest } from '@molecule/api-multi-tenancy'

/**
 * Resolves the tenant id(s) the *authenticated principal* of a request is
 * permitted to act as — typically read from a verified session/JWT on the
 * request (e.g. `req.user.tenantIds`), never from the client-supplied header.
 *
 * @param req - The incoming request (after your auth middleware has populated it).
 * @returns The permitted tenant id(s), or `null`/`undefined`/`[]` if the
 *   principal is bound to no tenant.
 */
export type AuthorizedTenantResolver = (
  req: TenancyRequest,
) => string | string[] | null | undefined | Promise<string | string[] | null | undefined>

/**
 * Configuration options for the multi-tenancy provider.
 *
 * NOTE: this provider tracks tenant *context* only — it does no database work
 * and does not scope queries. There is intentionally no `schemaPrefix` option,
 * because no schema is ever created or selected; per-tenant DATA isolation is
 * the application's responsibility (filter queries by `getTenant()`).
 */
export interface SchemaConfig {
  /**
   * The HTTP header name used to extract the tenant identifier from
   * incoming requests. Case-insensitive (headers are lowercased).
   *
   * @default 'x-tenant-id'
   */
  tenantHeader?: string

  /**
   * Default tenant ID to use when no tenant is resolved from the request.
   * If not set and no tenant is found, the middleware returns a 400 error.
   *
   * SECURITY: this value is *server-supplied configuration* (trusted) — unlike
   * the request header, it is not attacker-controlled, so it is activated
   * without the membership/existence checks applied to header-derived tenants.
   * Only set this to a tenant every unauthenticated caller is allowed to use.
   */
  defaultTenantId?: string

  /**
   * Resolver that returns the tenant id(s) the *authenticated principal* is a
   * member of, used to authorize the (attacker-controlled) tenant header.
   *
   * SECURITY: the tenant header is client-supplied and MUST NOT be trusted on
   * its own — any caller can send `x-tenant-id: <victim-tenant>`. When this
   * resolver is provided, the middleware rejects (403) every request whose
   * header tenant is not among the ids it returns. When it is omitted, the
   * raw-header middleware is *unauthenticated* and must be composed strictly
   * behind your own auth + tenant-membership gate (see the module `@remarks`).
   */
  resolveAuthorizedTenantIds?: AuthorizedTenantResolver

  /**
   * [M5-2] Opt-in to honor the raw (attacker-controlled) tenant header WITHOUT a
   * `resolveAuthorizedTenantIds` resolver. Default `false` (secure by default): when no
   * resolver is configured the middleware refuses (403) to activate a header-named tenant,
   * because trusting the bare header lets any caller send `x-tenant-id: <victim-tenant>`
   * and read/write another tenant's data (cross-tenant IDOR). Set to `true` ONLY when the
   * middleware is mounted strictly behind your own auth + tenant-membership gate that has
   * already validated the header — an explicit, audited choice, not the default.
   */
  allowUnauthorizedTenantHeader?: boolean
}
