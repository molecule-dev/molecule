# @molecule/api-audit-database

Database-backed audit provider for molecule.dev.

Persists audit trail entries using the abstract `DataStore` from
`@molecule/api-database`. Supports filtering, pagination, and export
to CSV or JSON.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-audit'
import { provider } from '@molecule/api-audit-database'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-audit-database @molecule/api-audit @molecule/api-database
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

## Core Interface
Implements `@molecule/api-audit` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-audit'
import { provider } from '@molecule/api-audit-database'

export function setupAuditDatabase(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-audit` ^1.0.0
- `@molecule/api-database` ^1.0.0

### Runtime Dependencies

- `@molecule/api-audit`
- `@molecule/api-database`

- **Wire the database bond first** — every method uses the abstract `DataStore`
  (`create`/`findMany`/`count` from `@molecule/api-database`), which throws if no
  database provider is bonded when the first audit call runs.
- **The audit table is NOT auto-created.** Ship a migration for `audit_log` (or your
  `config.tableName`) with columns: `id` TEXT PRIMARY KEY, `actor` TEXT NOT NULL,
  `action` TEXT NOT NULL, `resource` TEXT NOT NULL, `resource_id` TEXT NULL,
  `details` TEXT NULL (a JSON string — stringified on write, parsed on read),
  `ip` TEXT NULL, `user_agent` TEXT NULL, `timestamp` TIMESTAMPTZ/TEXT NOT NULL
  (ISO-8601; range-filtered and sorted descending).
