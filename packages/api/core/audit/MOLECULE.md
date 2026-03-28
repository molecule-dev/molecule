# @molecule/api-audit

Audit core interface for molecule.dev.

Provides the `AuditProvider` interface for recording and querying audit
trail entries. Bond a concrete provider (e.g. `@molecule/api-audit-database`,
`@molecule/api-audit-file`) at startup via `setProvider()`.

## Type
`core`

## Installation
```bash
npm install @molecule/api-audit
```

## Usage

```typescript
import { setProvider, log, query } from '@molecule/api-audit'
import { provider } from '@molecule/api-audit-database'

// Wire the provider at startup
setProvider(provider)

// Record an audit entry
await log({ actor: 'user:1', action: 'create', resource: 'project', resourceId: 'proj-42' })

// Query audit records
const results = await query({ actor: 'user:1', page: 1, perPage: 20 })
```

## API

### Interfaces

#### `AuditEntry`

An audit trail entry to be recorded.

```typescript
interface AuditEntry {
  /** The entity performing the action (e.g. user ID, system identifier). */
  actor: string

  /** The action performed (e.g. `create`, `update`, `delete`, `login`). */
  action: string

  /** The type of resource acted upon (e.g. `project`, `user`, `setting`). */
  resource: string

  /** Optional identifier of the specific resource instance. */
  resourceId?: string

  /** Optional additional details about the action. */
  details?: Record<string, unknown>

  /** Optional IP address of the request origin. */
  ip?: string

  /** Optional user agent string of the request origin. */
  userAgent?: string
}
```

#### `AuditProvider`

Audit provider interface.

All audit providers must implement this interface to provide audit trail
recording, querying, and export capabilities.

```typescript
interface AuditProvider {
  /**
   * Records an audit trail entry.
   *
   * @param entry - The audit entry to record.
   */
  log(entry: AuditEntry): Promise<void>

  /**
   * Queries audit records with optional filtering and pagination.
   *
   * @param options - Query filters and pagination options.
   * @returns A paginated result set of audit records.
   */
  query(options: AuditQuery): Promise<PaginatedResult<AuditRecord>>

  /**
   * Exports audit records matching the query in the specified format.
   *
   * @param options - Query filters for the records to export.
   * @param format - The export format (`csv` or `json`).
   * @returns A `Buffer` containing the exported data.
   */
  export(options: AuditQuery, format: AuditExportFormat): Promise<Buffer>
}
```

#### `AuditQuery`

Query options for filtering and paginating audit records.

```typescript
interface AuditQuery {
  /** Filter by actor identifier. */
  actor?: string

  /** Filter by action type. */
  action?: string

  /** Filter by resource type. */
  resource?: string

  /** Filter by specific resource instance identifier. */
  resourceId?: string

  /** Include only records created at or after this date. */
  startDate?: Date

  /** Include only records created at or before this date. */
  endDate?: Date

  /** Page number for pagination (1-based). */
  page?: number

  /** Number of records per page. */
  perPage?: number
}
```

#### `AuditRecord`

A persisted audit record with server-assigned metadata.

```typescript
interface AuditRecord extends AuditEntry {
  /** Unique identifier for this audit record. */
  id: string

  /** Timestamp when the audit record was created. */
  timestamp: Date
}
```

#### `PaginatedResult`

Paginated result set for audit queries.

```typescript
interface PaginatedResult<T> {
  /** The records for the current page. */
  data: T[]

  /** Total number of records matching the query. */
  total: number

  /** Current page number (1-based). */
  page: number

  /** Number of records per page. */
  perPage: number

  /** Total number of pages. */
  totalPages: number
}
```

### Types

#### `AuditExportFormat`

Supported export formats for audit data.

```typescript
type AuditExportFormat = 'csv' | 'json'
```

### Functions

#### `auditExport(options, format)`

Exports audit records matching the query in the specified format.

```typescript
function auditExport(options: AuditQuery, format: AuditExportFormat): Promise<Buffer<ArrayBufferLike>>
```

- `options` — Query filters for the records to export.
- `format` — The export format (`csv` or `json`).

**Returns:** A `Buffer` containing the exported data.

#### `getProvider()`

Retrieves the bonded audit provider, throwing if none is configured.

```typescript
function getProvider(): AuditProvider
```

**Returns:** The bonded audit provider.

#### `hasProvider()`

Checks whether an audit provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an audit provider is bonded.

#### `log(entry)`

Records an audit trail entry.

```typescript
function log(entry: AuditEntry): Promise<void>
```

- `entry` — The audit entry to record.

#### `query(options)`

Queries audit records with optional filtering and pagination.

```typescript
function query(options: AuditQuery): Promise<PaginatedResult<AuditRecord>>
```

- `options` — Query filters and pagination options.

**Returns:** A paginated result set of audit records.

#### `setProvider(provider)`

Registers an audit provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: AuditProvider): void
```

- `provider` — The audit provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
