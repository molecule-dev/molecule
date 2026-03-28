# @molecule/api-reporting-database

Database-backed reporting provider for molecule.dev.

Implements the `ReportProvider` interface using the bonded
`@molecule/api-database` pool for SQL-based aggregate and
time-series reporting. No external analytics engine required —
uses the existing database bond.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-reporting-database
```

## Usage

```typescript
import { setProvider } from '@molecule/api-reporting'
import { provider } from '@molecule/api-reporting-database'

setProvider(provider)
```

## API

### Interfaces

#### `DatabaseReportingOptions`

Configuration options for the database reporting provider.

```typescript
interface DatabaseReportingOptions {
  /**
   * Table prefix for internal reporting tables (schedules, etc.).
   *
   * @default '_reporting_'
   */
  tablePrefix?: string

  /**
   * Maximum rows returned when no limit is specified on aggregate queries.
   *
   * @default 10000
   */
  maxRows?: number
}
```

### Functions

#### `createProvider(options)`

Creates a database-backed reporting provider instance.

Uses the bonded `@molecule/api-database` pool for all queries. Aggregate
and time-series reports are translated to parameterized SQL. Scheduled
reports are persisted to a database table for external schedulers to consume.

```typescript
function createProvider(options?: DatabaseReportingOptions): ReportProvider
```

- `options` — Provider configuration options.

**Returns:** A fully configured `ReportProvider` implementation.

### Constants

#### `provider`

Default lazily-initialized database reporting provider.
Uses the bonded database pool for queries.

```typescript
const provider: ReportProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-reporting` ^1.0.0
