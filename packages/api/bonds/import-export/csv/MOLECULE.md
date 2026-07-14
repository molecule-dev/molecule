# @molecule/api-import-export-csv

CSV import/export provider for molecule.dev.

Implements the {@link ImportExportProvider} contract using pure TypeScript
CSV parsing/formatting and the bonded `@molecule/api-database` DataStore
for all database operations.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-import-export'
import { provider } from '@molecule/api-import-export-csv'

// Wire the CSV provider at startup
setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-import-export-csv
```

## API

### Interfaces

#### `CsvProviderOptions`

Configuration options for the CSV import/export provider.

```typescript
interface CsvProviderOptions {
  /** CSV field delimiter character. Defaults to `','`. */
  delimiter?: string

  /** Maximum number of rows to process per batch during import. Defaults to `1000`. */
  defaultBatchSize?: number

  /** Maximum number of rows to export in a single query. Defaults to `50000`. */
  maxExportRows?: number
}
```

### Functions

#### `createProvider(options)`

Creates a CSV import/export provider instance.

Uses the bonded `@molecule/api-database` DataStore for all database
operations. CSV parsing/formatting is done in pure TypeScript with
no native dependencies.

```typescript
function createProvider(options?: CsvProviderOptions): ImportExportProvider
```

- `options` — Provider configuration options.

**Returns:** A fully configured `ImportExportProvider` implementation.

#### `formatCSV(rows, columns, delimiter)`

Formats an array of row objects into a CSV string.

```typescript
function formatCSV(rows: Record<string, unknown>[], columns?: string[], delimiter?: string): string
```

- `rows` — Array of row objects to format.
- `columns` — Optional ordered list of column names. Defaults to all keys of the first row.
- `delimiter` — Field delimiter character. Defaults to `','`.

**Returns:** CSV-formatted string.

#### `formatExcel(rows, columns)`

Formats row objects as an XML Spreadsheet 2003 document (opens in Excel/LibreOffice).

```typescript
function formatExcel(rows: Record<string, unknown>[], columns?: string[]): string
```

- `rows` — Array of row objects to format.
- `columns` — Optional ordered list of column names.

**Returns:** XML Spreadsheet string.

#### `parseCSV(text, delimiter)`

Parses a CSV string into an array of row objects using the header row as keys.

```typescript
function parseCSV(text: string, delimiter?: string): Record<string, string>[]
```

- `text` — The CSV text to parse.
- `delimiter` — Field delimiter character. Defaults to `','`.

**Returns:** Array of parsed row objects keyed by header names.

### Constants

#### `provider`

Default lazily-initialized CSV import/export provider.
Uses the bonded DataStore for database operations.

```typescript
const provider: ImportExportProvider
```

## Core Interface
Implements `@molecule/api-import-export` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-import-export'
import { provider } from '@molecule/api-import-export-csv'

export function setupImportExportCsv(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-import-export` ^1.0.0

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Exporting from the UI downloads a file whose rows and columns match
  the data on screen (spot-check at least one row's values).
- [ ] Importing a valid file adds the records: they appear in the UI and
  survive a full reload.
- [ ] If the app surfaces column mapping, a file whose headers differ from
  the field names imports into the RIGHT fields via the mapping.
- [ ] A malformed file (wrong columns, broken rows) is rejected with a
  readable error — no silent partial import; per-row errors (if reported)
  are truthful.
- [ ] Re-importing the same file honors the app's duplicate policy (e.g.
  skip-duplicates does not double the rows).
- [ ] Round-trip integrity: export, then re-import the same file — values,
  encodings, and special characters come back unchanged.
