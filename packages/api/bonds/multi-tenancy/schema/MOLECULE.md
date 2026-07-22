# @molecule/api-multi-tenancy-schema

Multi-tenancy provider for molecule.dev (`@molecule/api-multi-tenancy-schema`).

Implements the `TenancyProvider` interface as a request-scoped tenant-context
tracker: an active-tenant context (`AsyncLocalStorage`), an in-process tenant
registry, and header-based tenant resolution (`x-tenant-id` by default).
Despite the package name it does NOT create or select database schemas and
does NOT scope queries — it provides tenant CONTEXT, not data isolation. The
application must isolate its own data from `getTenant()`; see the remarks for
what "schema" does and does not mean here.

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
  resolveAuthorizedTenantIds: (req) => {
    const user = req.user as { tenantIds?: string[] } | undefined
    return user?.tenantIds ?? []
  },
})
setProvider(secureProvider)
// app.use(authMiddleware, getTenantMiddleware())

// ISOLATION IS YOUR JOB: this bond only tracks the active tenant. In your
// data layer, scope every query by getTenant() — e.g.:
//   import { getTenant } from '@molecule/api-multi-tenancy'
//   store.findMany('records', { where: { tenantId: getTenant() } })
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

Configuration options for the multi-tenancy provider.

NOTE: this provider tracks tenant *context* only — it does no database work
and does not scope queries. There is intentionally no `schemaPrefix` option,
because no schema is ever created or selected; per-tenant DATA isolation is
the application's responsibility (filter queries by `getTenant()`).

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

Creates a multi-tenancy provider: request-scoped tenant context, an in-process
tenant registry, and secure-by-default header-resolution middleware. It
performs no database work and does not scope queries — the application must
isolate tenant data itself from `getTenant()` (see the module docs).

```typescript
function createProvider(config?: SchemaConfig): TenancyProvider
```

- `config` — Provider configuration.

**Returns:** A `TenancyProvider` providing request-scoped tenant context (it does NOT isolate data by itself).

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

Default multi-tenancy provider instance — request-scoped tenant context, an
in-process tenant registry, and secure header middleware. Does no database
schema work; the application isolates its own data from `getTenant()`.

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
   enforcing per-tenant DATA isolation is the application's job — read
   `getTenant()` in your data layer and filter every query by it (e.g. a
   `tenant_id` column). The package name refers to the *intended*
   schema-per-tenant strategy; the actual schema DDL / `search_path`
   scoping is not implemented here (there is no `schemaPrefix` option —
   it would only mislead), so treat this bond as a tenant-context tracker,
   not a data-isolation boundary.

## E2E Tests

Integration checklist — this bond provides the tenant *context* + a secure
header middleware; it does NOT isolate data, so the app must scope its own
queries. Drive the real UI (live preview, no mocks) and check every box:
- [ ] Secure header handling: with `resolveAuthorizedTenantIds` wired, a
  request carrying a spoofed `x-tenant-id` for a tenant the authenticated
  caller is NOT a member of is rejected (403) and never activates that
  tenant; the same call with the caller's own tenant succeeds.
- [ ] Request-scoped context: inside a request `getTenant()` returns that
  request's tenant across `await`s, and two concurrent requests never see
  each other's tenant (no bleed).
- [ ] App-enforced data isolation (THIS bond does not do it for you): every
  read/write path filters by `getTenant()` (e.g. a `tenant_id` column).
  Create records as tenant A, then as tenant B confirm none of A's data is
  visible or reachable anywhere B can look (lists, detail, search, exports),
  and vice-versa. A box you can't check is an isolation bug in YOUR data
  layer to fix, never a skip.
- [ ] No IDOR across the boundary: as tenant B, hitting a record id that
  belongs to A returns 403/404, never A's data — your handlers re-check
  tenant membership server-side on every access, not just at list time.
- [ ] Registry lifecycle: `createTenant`/`listTenants`/`deleteTenant` reflect
  the in-process registry; tenants are per-process and lost on restart, so
  back them with a persistent store before relying on them in production.
