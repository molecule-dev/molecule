# @molecule/api-permissions-casbin

Casbin-based permissions provider for molecule.dev.

Provides role-based and attribute-based access control (RBAC/ABAC)
using Casbin. Supports custom model definitions, policy files,
and external adapters for persistent storage.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-permissions-casbin
```

## Usage

```typescript
import { setProvider } from '@molecule/api-permissions'
import { provider } from '@molecule/api-permissions-casbin'

setProvider(provider)

// Or create a custom instance with a specific model
import { createProvider } from '@molecule/api-permissions-casbin'

const casbinPerms = createProvider({ modelPath: './rbac_model.conf' })
setProvider(casbinPerms)
```

## API

### Interfaces

#### `CasbinPermissionsOptions`

Configuration options for the Casbin permissions provider.

```typescript
interface CasbinPermissionsOptions {
  /**
   * Path to the Casbin model configuration file.
   * If not provided, a default RBAC model is used.
   */
  modelPath?: string

  /**
   * Inline Casbin model definition string.
   * Takes precedence over `modelPath` if both are provided.
   */
  modelText?: string

  /**
   * Path to the Casbin policy file.
   * If not provided, policies are stored in-memory only.
   */
  policyPath?: string

  /**
   * Casbin adapter instance for persistent policy storage.
   * If not provided, uses an in-memory adapter.
   */
  adapter?: unknown
}
```

### Functions

#### `createProvider(options)`

Creates a Casbin-backed permissions provider implementing the
`PermissionsProvider` interface. If no options are provided, uses
a default RBAC model with in-memory policy storage.

```typescript
function createProvider(options?: CasbinPermissionsOptions): PermissionsProvider
```

- `options` — Casbin configuration options.

**Returns:** A `PermissionsProvider` backed by Casbin.

### Constants

#### `provider`

Default Casbin permissions provider instance. Lazily initialises on first
property access using the default RBAC model.

```typescript
const provider: PermissionsProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-permissions` ^1.0.0
