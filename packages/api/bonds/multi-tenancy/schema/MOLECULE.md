# @molecule/api-multi-tenancy-schema

Schema-based multi-tenancy provider for molecule.dev.

Implements the `TenancyProvider` interface with request-scoped tenant
context and header-based tenant resolution (`x-tenant-id` by default).
Tenant records live in an in-process registry; the provider does NOT
create or select database schemas — see the remarks for what "schema"
does and does not mean here.

## Quick Start

```typescript
import { setProvider, getTenantMiddleware } from '@molecule/api-multi-tenancy'
import { provider, createProvider } from '@molecule/api-multi-tenancy-schema'

// Wire the provider at startup (default config)
setProvider(provider)

// SECURE wiring: authorize the header against the authenticated principal.
// `req.user` is populated by your auth middleware mounted earlier in the chain.
const secureProvider = createProvider({
  tenantHeader: 'x-org-id',
  schemaPrefix: 'org_',
  resolveAuthorizedTenantIds: (req) => {
    const user = req.user as { tenantIds?: string[] } | undefined
    return user?.tenantIds ?? []
  },
})
setProvider(secureProvider)
// app.use(authMiddleware, getTenantMiddleware())
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-multi-tenancy-schema @molecule/api-multi-tenancy
```

## API

### Interfaces

#### `SchemaConfig`

Configuration options for the schema-based multi-tenancy provider.

```typescript
interface SchemaConfig {
  /**
   * The HTTP header name used to extract the tenant identifier from
   * incoming requests. Case-insensitive (headers are lowercased).
   *
   * @default 'x-tenant-id'
   */
  tenantHeader?: string

  /**
   * RESERVED — currently unused. Intended schema-name prefix for a future
   * schema-per-tenant integration (`{schemaPrefix}{tenantId}`); today the
   * provider performs no schema creation, selection, or query scoping, and
   * setting this has no effect.
   *
   * @default 'tenant_'
   */
  schemaPrefix?: string

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
```

### Types

#### `AuthorizedTenantResolver`

Resolves the tenant id(s) the *authenticated principal* of a request is
permitted to act as — typically read from a verified session/JWT on the
request (e.g. `req.user.tenantIds`), never from the client-supplied header.

```typescript
type AuthorizedTenantResolver = (
  req: TenancyRequest,
) => string | string[] | null | undefined | Promise<string | string[] | null | undefined>
```

### Functions

#### `createProvider(config)`

Creates a schema-based multi-tenancy provider.

```typescript
function createProvider(config?: SchemaConfig): TenancyProvider
```

- `config` — Provider configuration.

**Returns:** A `TenancyProvider` using schema-based tenant isolation.

#### `runWithTenant(tenantId, fn)`

Runs `fn` inside a fresh tenant context scope. Use this to establish a tenant
for code that runs outside the HTTP middleware (background jobs, scripts,
tests) so `getTenant()`/`setTenant()` resolve correctly.

```typescript
function runWithTenant(tenantId: string, fn: () => T): T
```

- `tenantId` — The tenant id to activate for the duration of `fn`.
- `fn` — The function to run within the tenant scope.

**Returns:** Whatever `fn` returns.

### Constants

#### `provider`

Default schema-based multi-tenancy provider instance.

Lazily initializes on first property access with default configuration.

```typescript
const provider: TenancyProvider
```

## Core Interface
Implements `@molecule/api-multi-tenancy` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-multi-tenancy'
import { provider } from '@molecule/api-multi-tenancy-schema'

export function setupMultiTenancySchema(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-multi-tenancy` ^1.0.0

### Runtime Dependencies

- `@molecule/api-multi-tenancy`

**Security model — read before mounting the middleware.**

1. **Tenant context is request-scoped (`AsyncLocalStorage`), not a module
   global.** `getTenant()` always returns the current request's tenant, even
   across `await`s under concurrency — no cross-request tenant bleed.
   `setTenant()` throws outside a request scope; use `runWithTenant()` for
   background jobs.
2. **The tenant header is attacker-controlled — secure by default ([M5-2]).**
   Any caller can send `x-tenant-id: <victim-tenant>`. Without a
   `resolveAuthorizedTenantIds` resolver the middleware REFUSES (403) to honor
   the header at all — so the default never grants cross-tenant access. To
   authorize the header, pass `resolveAuthorizedTenantIds` (rejects 403 when the
   header tenant is not one the authenticated principal is a member of); or, if
   you gate membership upstream, set `allowUnauthorizedTenantHeader: true` to opt
   into the raw-header path and mount the middleware strictly behind that gate.
   Either way the middleware also validates the header tenant exists and is
   `active` (404/403 otherwise) before activating it.
3. **Tenant records are IN-MEMORY and this provider does no database
   work.** `createTenant()` writes to a per-process `Map` — tenants are
   lost on restart (the middleware then 404s every header tenant until
   they are re-created) and are NOT shared across instances. No database
   schema is created or selected, and queries are NOT scoped for you:
   derive per-tenant scoping in your own data layer from `getTenant()`
   (e.g. a `tenant_id` column filter or your own schema switching). The
   `schemaPrefix` config option is currently reserved and has no effect.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual tenant screens/flows, and check every box off
one by one. This package exists for ISOLATION, so the security boxes are NOT
optional — a box you can't check is a tenant-isolation bug to fix, never a
skip:
- [ ] Cross-tenant invisibility: create records while signed in as tenant A,
  then sign in as tenant B — none of A's data is visible or reachable
  anywhere B can look (lists, detail pages, search results, and
  exports/downloads are ALL scoped to the current tenant). Reverse the roles
  (B's data, viewed as A) and confirm neither tenant ever sees the other's.
- [ ] No IDOR across the tenant boundary: while signed in as tenant B, take a
  real record id that belongs to tenant A (guess/increment one, or copy it
  from A's session) and hit its detail/edit/delete/API route directly. The
  server REFUSES with 403/404 and never returns A's data — the id existing is
  not enough; tenant membership is re-checked server-side on every access.
- [ ] Tenant context is derived SERVER-SIDE from the authenticated
  session/subdomain, never trusted from the client. Sending a spoofed tenant
  header (default `x-tenant-id`) or tenant body/query param for a tenant the
  caller doesn't belong to does NOT switch tenants — the request is rejected
  (403), never silently honored (this is what `resolveAuthorizedTenantIds`
  enforces). The same call with no header resolves the caller's own tenant,
  not a global or leaked one.
- [ ] Membership is enforced both ways: a user can act only on the tenant(s)
  they belong to; attempting to join, read, or write a tenant they aren't a
  member of is refused, and revoking a user's membership immediately cuts off
  their access to that tenant's data.
- [ ] Per-tenant config/branding/limits apply to the correct tenant only —
  tenant A's settings (name, `metadata`, theme, quotas) render for A and
  never leak into B; changing A's config leaves B's untouched.
- [ ] Shared/global resources (if any) are clearly separated from
  tenant-scoped ones: platform-wide data is intentionally visible across
  tenants, and nothing tenant-scoped is accidentally exposed as global.
