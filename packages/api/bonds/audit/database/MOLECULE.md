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

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Every auditable action the app defines (login, permission/role change,
  delete, export, settings change) performed in the UI actually WRITES an
  entry — `log()` is called from the handler that does the work, not merely
  defined. Confirm the entry exists via the audit view or a `query()`.
- [ ] Each written entry captures the real action + resource (+ resourceId)
  and a server-assigned timestamp — not a placeholder or the wrong resource.
- [ ] The recorded `actor` is the authenticated user from the server session:
  two different signed-in users produce two different actors, never a
  hardcoded/anonymous/client-supplied id.
- [ ] The audit log view (if the app exposes one) lists entries with correct
  details, and filtering by actor/action/resource/date range (`query`)
  narrows the results as expected.
- [ ] Reading or exporting the trail (`query`/`auditExport`) is admin-only — a
  normal user gets 403 / no UI and cannot read everyone else's activity.
- [ ] History is append-only / tamper-evident: no endpoint edits or deletes a
  past entry to cover tracks (the interface exposes only log/query/export) —
  try to mutate one and confirm there is no route.
