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
npm install @molecule/api-audit-file
```

## API

### Interfaces

#### `FileAuditConfig`

Configuration options for the file-based audit provider.

```typescript
interface FileAuditConfig {
  /** Directory path where audit log files are written. Defaults to `'./audit-logs'`. */
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-audit` ^1.0.0
