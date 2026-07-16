/**
 * Multi-tenancy core interface for molecule.dev.
 *
 * Provides the `TenancyProvider` interface for multi-tenant data isolation
 * including tenant lifecycle management, context switching, and middleware
 * integration. Bond a concrete provider (e.g. `@molecule/api-multi-tenancy-schema`)
 * at startup via `setProvider()`.
 *
 * @remarks
 * **Tenant resolution is security-critical — the tenant header is attacker-controlled.**
 * Any caller can send `x-tenant-id: <victim-tenant>`, so a header-named tenant must never
 * be honored on trust. Configure `resolveAuthorizedTenantIds` so the middleware rejects
 * (403) any header tenant the authenticated principal doesn't belong to, and mount
 * `getTenantMiddleware()` AFTER auth so the resolver can read the authenticated principal.
 *
 * - **Providers are secure by default — an unconfigured provider fails CLOSED.** With no
 *   `resolveAuthorizedTenantIds` configured, the schema bond REFUSES (403) every
 *   header-named tenant rather than activating it. So "403 on every tenant request" means
 *   the authorizer isn't wired — not that the package is broken. Only when membership is
 *   already enforced upstream may you opt into the raw-header path
 *   (`allowUnauthorizedTenantHeader: true` on the schema bond), and then the middleware
 *   MUST sit strictly behind that gate. A server-configured `defaultTenantId` (used only
 *   when no header is present) is trusted config and bypasses these checks.
 * - **Tenant context is request-scoped, never a module global.** `getTenant()` reflects
 *   the currently executing request, and the schema provider's `setTenant()` THROWS
 *   outside a request scope (this prevents cross-request tenant bleed). For background
 *   jobs, seeds, and scripts, establish a scope explicitly (e.g. the schema bond's
 *   `runWithTenant(tenantId, fn)`) instead of calling `setTenant()` at top level.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual tenant screens/flows, and check every box off
 * one by one. This package exists for ISOLATION, so the security boxes are NOT
 * optional — a box you can't check is a tenant-isolation bug to fix, never a
 * skip:
 * - [ ] Cross-tenant invisibility: create records while signed in as tenant A,
 *   then sign in as tenant B — none of A's data is visible or reachable
 *   anywhere B can look (lists, detail pages, search results, and
 *   exports/downloads are ALL scoped to the current tenant). Reverse the roles
 *   (B's data, viewed as A) and confirm neither tenant ever sees the other's.
 * - [ ] No IDOR across the tenant boundary: while signed in as tenant B, take a
 *   real record id that belongs to tenant A (guess/increment one, or copy it
 *   from A's session) and hit its detail/edit/delete/API route directly. The
 *   server REFUSES with 403/404 and never returns A's data — the id existing is
 *   not enough; tenant membership is re-checked server-side on every access.
 * - [ ] Tenant context is derived SERVER-SIDE from the authenticated
 *   session/subdomain, never trusted from the client. Sending a spoofed tenant
 *   header (default `x-tenant-id`) or tenant body/query param for a tenant the
 *   caller doesn't belong to does NOT switch tenants — the request is rejected
 *   (403), never silently honored (this is what `resolveAuthorizedTenantIds`
 *   enforces). The same call with no header resolves the caller's own tenant,
 *   not a global or leaked one.
 * - [ ] Membership is enforced both ways: a user can act only on the tenant(s)
 *   they belong to; attempting to join, read, or write a tenant they aren't a
 *   member of is refused, and revoking a user's membership immediately cuts off
 *   their access to that tenant's data.
 * - [ ] Per-tenant config/branding/limits apply to the correct tenant only —
 *   tenant A's settings (name, `metadata`, theme, quotas) render for A and
 *   never leak into B; changing A's config leaves B's untouched.
 * - [ ] Shared/global resources (if any) are clearly separated from
 *   tenant-scoped ones: platform-wide data is intentionally visible across
 *   tenants, and nothing tenant-scoped is accidentally exposed as global.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, createTenant, getTenantMiddleware } from '@molecule/api-multi-tenancy'
 * import { createProvider } from '@molecule/api-multi-tenancy-schema'
 *
 * // SECURE wiring: authorize the (attacker-controlled) tenant header against the
 * // authenticated principal. `req.user` is populated by your auth middleware earlier
 * // in the chain; the middleware 403s if the header tenant isn't in this list.
 * setProvider(
 *   createProvider({
 *     resolveAuthorizedTenantIds: (req) => {
 *       const user = req.user as { tenantIds?: string[] } | undefined
 *       return user?.tenantIds ?? []
 *     },
 *   }),
 * )
 *
 * // Create a new tenant
 * const tenant = await createTenant({ name: 'Acme Corp' })
 *
 * // Mount tenant resolution AFTER auth so the membership check has req.user.
 * app.use(authMiddleware, getTenantMiddleware())
 * ```
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
