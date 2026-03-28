# @molecule/app-data-table-tanstack

TanStack Table provider for the molecule data table interface.

Implements `DataTableProvider` from `@molecule/app-data-table` using
`@tanstack/table-core` for sorting, filtering, pagination, and row selection.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-data-table-tanstack
```

## Usage

```typescript
import { provider } from '@molecule/app-data-table-tanstack'
import { setProvider } from '@molecule/app-data-table'

setProvider(provider)
```

## API

### Interfaces

#### `TanStackTableConfig`

Configuration options for the TanStack Table data table provider.

```typescript
interface TanStackTableConfig {
  /**
   * Whether to enable debug mode in TanStack Table.
   * When `true`, TanStack logs internal state changes to the console.
   * Defaults to `false`.
   */
  debug?: boolean
}
```

### Functions

#### `createTanStackProvider(config)`

Creates a TanStack Table-backed data table provider.

```typescript
function createTanStackProvider(config?: TanStackTableConfig): DataTableProvider
```

- `config` — Optional TanStack-specific configuration.

**Returns:** A `DataTableProvider` backed by TanStack Table.

### Constants

#### `provider`

Default TanStack Table provider instance.

```typescript
const provider: DataTableProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-data-table` >=1.0.0
