# @molecule/api-feature-flags-database

Database-backed feature flags provider for molecule.dev.

Persists feature flags using the abstract `DataStore` from
`@molecule/api-database`. Supports rule-based targeting, percentage
rollouts, and bulk user evaluation.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-feature-flags-database
```

## Usage

```typescript
import { setProvider, isEnabled, setFlag } from '@molecule/api-feature-flags'
import { provider } from '@molecule/api-feature-flags-database'

// Wire the provider at startup (default table: 'feature_flags')
setProvider(provider)

// Or create with custom config
import { createProvider } from '@molecule/api-feature-flags-database'
const customProvider = createProvider({ tableName: 'flags' })
setProvider(customProvider)
```

## API

### Interfaces

#### `DatabaseFlagConfig`

Configuration options for the database-backed feature flags provider.

```typescript
interface DatabaseFlagConfig {
  /**
   * The database table name for storing feature flags.
   *
   * @default 'feature_flags'
   */
  tableName?: string
}
```

### Functions

#### `createProvider(config)`

Creates a database-backed feature flag provider.

```typescript
function createProvider(config?: DatabaseFlagConfig): FeatureFlagProvider
```

- `config` — Optional provider configuration.

**Returns:** A `FeatureFlagProvider` backed by the bonded `DataStore`.

### Constants

#### `provider`

Default database feature flags provider instance. Lazily initializes
on first property access with default options.

```typescript
const provider: FeatureFlagProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-feature-flags` ^1.0.0
