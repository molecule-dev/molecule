# @molecule/api-audit-file

File-based audit provider for molecule.dev.

Stores audit trail entries as newline-delimited JSON (NDJSON) files.
Supports log rotation, querying, and export to CSV or JSON. Ideal for
development, testing, or single-instance deployments.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-audit'
import { provider } from '@molecule/api-audit-file'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-audit-file @molecule/api-audit
```

## API

### Interfaces

#### `FileAuditConfig`

Configuration options for the file-based audit provider.

```typescript
interface FileAuditConfig {
  /** Directory path where audit log files are written. Must already exist — the provider does not create it. Defaults to `'./audit-logs'`. */
  directory?: string

  /** Maximum size (in bytes) of a single log file before rotation. Defaults to `10_485_760` (10 MB). */
  maxFileSize?: number

  /** Prefix for log file names. Defaults to `'audit'`. */
  filePrefix?: string
}
```

### Functions

#### `createProvider(config)`

Creates a file-based audit provider.

```typescript
function createProvider(config?: FileAuditConfig): AuditProvider
```

- `config` — Optional provider configuration.

**Returns:** An `AuditProvider` backed by NDJSON files on disk.

### Constants

#### `provider`

Default file audit provider instance. Lazily initializes on first
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
import { provider } from '@molecule/api-audit-file'

export function setupAuditFile(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-audit` ^1.0.0

### Runtime Dependencies

- `@molecule/api-audit`

- **Create the log directory before the first `log()` call.** The provider
  does NOT create it: `log()` throws `ENOENT` if `directory` (default
  `'./audit-logs'`) doesn't exist. `await mkdir('./audit-logs', { recursive: true })`
  at startup (or point `createProvider({ directory })` at an existing path).
- Appends rewrite the whole current log file and `query()`/`export()` load
  every matching record into memory — fine for dev/single-instance volumes;
  use `@molecule/api-audit-database` for sustained production write rates.

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
