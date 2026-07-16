# @molecule/api-multi-tenancy

Multi-tenancy core interface for molecule.dev.

Provides the `TenancyProvider` interface for multi-tenant data isolation
including tenant lifecycle management, context switching, and middleware
integration. Bond a concrete provider (e.g. `@molecule/api-multi-tenancy-schema`)
at startup via `setProvider()`.

## Quick Start

```typescript
import { setProvider, createTenant, getTenantMiddleware } from '@molecule/api-multi-tenancy'
import { createProvider } from '@molecule/api-multi-tenancy-schema'

// SECURE wiring: authorize the (attacker-controlled) tenant header against the
// authenticated principal. `req.user` is populated by your auth middleware earlier
// in the chain; the middleware 403s if the header tenant isn't in this list.
setProvider(
  createProvider({
    resolveAuthorizedTenantIds: (req) => {
      const user = req.user as { tenantIds?: string[] } | undefined
      return user?.tenantIds ?? []
    },
  }),
)

// Create a new tenant
const tenant = await createTenant({ name: 'Acme Corp' })

// Mount tenant resolution AFTER auth so the membership check has req.user.
app.use(authMiddleware, getTenantMiddleware())
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-multi-tenancy @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `CreateTenant`

Payload for creating a new tenant.

```typescript
interface CreateTenant {
  /** Human-readable tenant name. */
  name: string

  /** Optional metadata to associate with the tenant. */
  metadata?: Record<string, unknown>
}
```

#### `TenancyConfig`

Configuration options for a tenancy provider.

```typescript
interface TenancyConfig {
  /** Default tenant ID to use when none is set in context. */
  defaultTenantId?: string

  /** Whether to enforce tenant isolation strictly (throw on missing tenant). */
  strictMode?: boolean
}
```

#### `TenancyProvider`

Multi-tenancy provider interface.

All tenancy providers must implement this interface to provide
tenant lifecycle management, context switching, and middleware
integration for multi-tenant data isolation.

```typescript
interface TenancyProvider {
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
```

#### `TenancyRequest`

Express-compatible request object (minimal shape).

```typescript
interface TenancyRequest {
  /** Request headers. */
  headers: Record<string, string | string[] | undefined>
  [key: string]: unknown
}
```

#### `TenancyResponse`

Express-compatible response object (minimal shape).

```typescript
interface TenancyResponse {
  /** Sets the HTTP status code. */
  status(code: number): TenancyResponse

  /** Sends a JSON response. */
  json(body: unknown): TenancyResponse
  [key: string]: unknown
}
```

#### `Tenant`

Represents a tenant in the system.

```typescript
interface Tenant {
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
```

### Types

#### `TenancyNextFunction`

Express-compatible next function.

```typescript
type TenancyNextFunction = (err?: unknown) => void
```

#### `TenancyRequestHandler`

Express-compatible request handler for tenant middleware.

```typescript
type TenancyRequestHandler = (
  req: TenancyRequest,
  res: TenancyResponse,
  next: TenancyNextFunction,
) => void | Promise<void>
```

#### `TenantStatus`

Status of a tenant.

```typescript
type TenantStatus = 'active' | 'suspended' | 'pending' | 'deleted'
```

### Functions

#### `createTenant(tenant)`

Creates a new tenant using the bonded provider.

```typescript
function createTenant(tenant: CreateTenant): Promise<Tenant>
```

- `tenant` — The tenant creation payload.

**Returns:** The created tenant.

#### `deleteTenant(tenantId)`

Deletes a tenant using the bonded provider.

```typescript
function deleteTenant(tenantId: string): Promise<void>
```

- `tenantId` — The identifier of the tenant to delete.

**Returns:** Resolves when the tenant is removed.

#### `getProvider()`

Retrieves the bonded multi-tenancy provider, throwing if none is configured.

```typescript
function getProvider(): TenancyProvider
```

**Returns:** The bonded tenancy provider.

#### `getTenant()`

Retrieves the current tenant identifier using the bonded provider.

```typescript
function getTenant(): string | null
```

**Returns:** The current tenant ID or `null`.

#### `getTenantMiddleware()`

Creates tenant-resolving middleware using the bonded provider.

```typescript
function getTenantMiddleware(): TenancyRequestHandler
```

**Returns:** An Express request handler that sets the tenant context.

#### `hasProvider()`

Checks whether a multi-tenancy provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a tenancy provider is bonded.

#### `listTenants()`

Lists all tenants using the bonded provider.

```typescript
function listTenants(): Promise<Tenant[]>
```

**Returns:** Array of all tenants.

#### `setProvider(provider)`

Registers a multi-tenancy provider as the active singleton. Called by
bond packages during application startup.

```typescript
function setProvider(provider: TenancyProvider): void
```

- `provider` — The tenancy provider implementation to bond.

#### `setTenant(tenantId)`

Sets the current tenant context using the bonded provider.

```typescript
function setTenant(tenantId: string): void
```

- `tenantId` — The tenant identifier to activate.

## Available Providers

| Provider | Package |
|----------|---------|
| Multi Tenancy | `@molecule/api-multi-tenancy-schema` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`

**Tenant resolution is security-critical — the tenant header is attacker-controlled.**
Any caller can send `x-tenant-id: <victim-tenant>`, so a header-named tenant must never
be honored on trust. Configure `resolveAuthorizedTenantIds` so the middleware rejects
(403) any header tenant the authenticated principal doesn't belong to, and mount
`getTenantMiddleware()` AFTER auth so the resolver can read the authenticated principal.

- **Providers are secure by default — an unconfigured provider fails CLOSED.** With no
  `resolveAuthorizedTenantIds` configured, the schema bond REFUSES (403) every
  header-named tenant rather than activating it. So "403 on every tenant request" means
  the authorizer isn't wired — not that the package is broken. Only when membership is
  already enforced upstream may you opt into the raw-header path
  (`allowUnauthorizedTenantHeader: true` on the schema bond), and then the middleware
  MUST sit strictly behind that gate. A server-configured `defaultTenantId` (used only
  when no header is present) is trusted config and bypasses these checks.
- **Tenant context is request-scoped, never a module global.** `getTenant()` reflects
  the currently executing request, and the schema provider's `setTenant()` THROWS
  outside a request scope (this prevents cross-request tenant bleed). For background
  jobs, seeds, and scripts, establish a scope explicitly (e.g. the schema bond's
  `runWithTenant(tenantId, fn)`) instead of calling `setTenant()` at top level.
