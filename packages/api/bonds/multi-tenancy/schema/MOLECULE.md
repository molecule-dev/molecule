# @molecule/api-multi-tenancy-schema

Schema-based multi-tenancy provider for molecule.dev.

Implements the `TenancyProvider` interface with schema-based tenant
isolation. Each tenant is logically mapped to a database schema via
a configurable prefix. Includes middleware that resolves the tenant
from a configurable HTTP header (`x-tenant-id` by default).

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
npm install @molecule/api-multi-tenancy-schema
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
   * Schema name prefix applied to tenant schemas.
   * The full schema name is `{schemaPrefix}{tenantId}`.
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
) =>
  | string
  | string[]
  | null
  | undefined
  | Promise<string | string[] | null | undefined>
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
import { setProvider, setTenant } from '@molecule/api-multi-tenancy'
import { provider } from '@molecule/api-multi-tenancy-schema'

export function setupMultiTenancySchema(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-multi-tenancy` ^1.0.0

**Security model — read before mounting the middleware.**

1. **Tenant context is request-scoped (`AsyncLocalStorage`), not a module
   global.** `getTenant()` always returns the current request's tenant, even
   across `await`s under concurrency — no cross-request tenant bleed.
   `setTenant()` throws outside a request scope; use `runWithTenant()` for
   background jobs.
2. **The tenant header is attacker-controlled.** Any caller can send
   `x-tenant-id: <victim-tenant>`. The raw-header middleware on its own is
   *unauthenticated*. ALWAYS either pass `resolveAuthorizedTenantIds` (so the
   middleware rejects 403 when the header tenant is not one the authenticated
   principal is a member of) **or** mount the middleware strictly behind your
   own auth + tenant-membership gate. The middleware additionally validates
   the header tenant exists and is `active` (404/403 otherwise) before
   activating it.
