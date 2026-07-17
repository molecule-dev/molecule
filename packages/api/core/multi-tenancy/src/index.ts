/**
 * Multi-tenancy core interface for molecule.dev.
 *
 * Provides the `TenancyProvider` interface — tenant lifecycle (create/delete/
 * list), request-scoped active-tenant context, and header-resolution
 * middleware. Bond a concrete provider (e.g. `@molecule/api-multi-tenancy-schema`)
 * at startup via `setProvider()`.
 *
 * @remarks
 * - **Data isolation is the application's responsibility, not the provider's.**
 *   A provider supplies the tenant CONTEXT (which tenant the current request
 *   belongs to) plus secure header resolution; the app must scope its own
 *   queries by the active tenant — filter every read/write by a `tenant_id`
 *   column derived from `getTenant()`. A provider MAY additionally enforce
 *   isolation at the data layer, but the shipped `@molecule/api-multi-tenancy-schema`
 *   bond does NOT — it is a context tracker, so the isolation checkboxes below
 *   are only satisfied once YOUR queries are tenant-scoped.
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
 * one by one. These boxes describe the tenant isolation your APP must achieve
 * using the tenant context this package provides (the package gives you the
 * active-tenant context + secure header handling; you scope the data). A box
 * you can't check is a bug in your query-scoping or a missing authorizer
 * wiring, to fix — never a skip:
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
