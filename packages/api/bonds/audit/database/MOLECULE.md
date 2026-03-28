# @molecule/api-audit-database

Database-backed audit provider for molecule.dev.

Persists audit trail entries using the abstract `DataStore` from
`@molecule/api-database`. Supports filtering, pagination, and export
to CSV or JSON.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-audit-database
```

## Usage

```typescript
import { setProvider } from '@molecule/api-audit'
import { provider } from '@molecule/api-audit-database'

setProvider(provider)
```

## API

### Interfaces

#### `DatabaseAuditConfig`

Configuration options for the database-backed audit provider.

```typescript
interface DatabaseAuditConfig {
  /** Name of the database table used to store audit records. Defaults to `'audit_log'`. */
  tableName?: string
}
```

### Functions

#### `createProvider(config)`

Creates a database-backed audit provider.

```typescript
function createProvider(config?: DatabaseAuditConfig): AuditProvider
```

- `config` — Optional provider configuration.

**Returns:** An `AuditProvider` backed by the bonded `DataStore`.

### Constants

#### `provider`

Default database audit provider instance. Lazily initializes on first
property access with default options.

```typescript
const provider: AuditProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-audit` ^1.0.0
- `@molecule/api-database` ^1.0.0
