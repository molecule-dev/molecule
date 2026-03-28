# @molecule/api-permissions-custom

Simple in-memory role-based permissions provider for molecule.dev.

Provides role-based and attribute-based access control (RBAC/ABAC)
using pure in-memory storage with no external dependencies. Supports
wildcard matching on actions/resources and basic ABAC condition
evaluation. Ideal for development, testing, or single-instance
deployments.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-permissions-custom
```

## Usage

```typescript
import { setProvider } from '@molecule/api-permissions'
import { provider } from '@molecule/api-permissions-custom'

setProvider(provider)

// Or create a custom instance
import { createProvider } from '@molecule/api-permissions-custom'

const perms = createProvider({ wildcards: true })
setProvider(perms)
```

## API

### Interfaces

#### `CustomPermissionsOptions`

Configuration options for the custom permissions provider.

```typescript
interface CustomPermissionsOptions {
  /**
   * Whether wildcard (`*`) matching is enabled for actions and resources.
   * When enabled, a permission with action `*` or resource `*` matches any
   * action or resource respectively.
   *
   * @defaultValue true
   */
  wildcards?: boolean
}
```

### Functions

#### `createProvider(options)`

Creates a custom in-memory permissions provider implementing the
`PermissionsProvider` interface. All state is stored in memory — no
external services or libraries are required.

```typescript
function createProvider(options?: CustomPermissionsOptions): PermissionsProvider
```

- `options` — Optional provider configuration.

**Returns:** A `PermissionsProvider` backed by in-memory storage.

### Constants

#### `provider`

Default custom permissions provider instance. Lazily initialises on first
property access with default options.

```typescript
const provider: PermissionsProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-permissions` ^1.0.0
