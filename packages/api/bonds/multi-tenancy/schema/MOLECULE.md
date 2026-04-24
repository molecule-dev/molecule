# @molecule/api-multi-tenancy-schema

Schema-based multi-tenancy provider for molecule.dev.

Implements the `TenancyProvider` interface with schema-based tenant
isolation. Each tenant is logically mapped to a database schema via
a configurable prefix. Includes middleware that resolves the tenant
from a configurable HTTP header (`x-tenant-id` by default).

## Quick Start

```typescript
import { setProvider, getTenantMiddleware } from '@molecule/api-multi-tenancy'
import { provider } from '@molecule/api-multi-tenancy-schema'

// Wire the provider at startup (default config)
setProvider(provider)

// Or create with custom config
import { createProvider } from '@molecule/api-multi-tenancy-schema'
const customProvider = createProvider({
  tenantHeader: 'x-org-id',
  schemaPrefix: 'org_',
})
setProvider(customProvider)
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
   */
  defaultTenantId?: string
}
```

### Functions

#### `createProvider(config)`

Creates a schema-based multi-tenancy provider.

```typescript
function createProvider(config?: SchemaConfig): TenancyProvider
```

- `config` — Provider configuration.

**Returns:** A `TenancyProvider` using schema-based tenant isolation.

### Constants

#### `provider`

Default schema-based multi-tenancy provider instance.

Lazily initializes on first property access with default configuration.

```typescript
const provider: TenancyProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-multi-tenancy` ^1.0.0
