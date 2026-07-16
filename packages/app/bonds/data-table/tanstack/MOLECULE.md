# @molecule/app-data-table-tanstack

TanStack Table provider for the molecule data table interface.

Implements `DataTableProvider` from `@molecule/app-data-table` using
`@tanstack/table-core` for sorting, filtering, pagination, and row selection.

## Quick Start

```typescript
import { provider } from '@molecule/app-data-table-tanstack'
import { setProvider } from '@molecule/app-data-table'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-data-table-tanstack @molecule/app-data-table @tanstack/table-core
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

## Core Interface
Implements `@molecule/app-data-table` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-data-table'
import { provider } from '@molecule/app-data-table-tanstack'

export function setupDataTableTanstack(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-data-table` >=1.0.0

### Runtime Dependencies

- `@molecule/app-data-table`
- `@tanstack/table-core`

HEADLESS — the instance computes sorted/filtered/paginated state; your
app renders the table (via `getClassMap()`/`cm.*`) from `getRows()` and
re-reads after each mutation or in `onStateChange`. Integration notes:
`setData()` resets to page 0 and CLEARS row selection; selection is
row-INDEX based and `selectAll()` targets the filtered set; omit
`pagination` and `getRows()` returns every (sorted, filtered) row;
`setSort()` replaces the whole sort (single column). Column
`align`/`pinned`/`visible`/`cell` are passed through for your renderer —
the instance does not apply them.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] The table renders the seeded rows with the expected columns (no empty grid
  against non-empty data, no `undefined` cells).
- [ ] Clicking a sortable header re-orders the rows (toggle asc/desc and check
  the first row actually changes; a sort indicator is visible).
- [ ] Entering a filter/search value narrows the rows to matches; clearing it
  restores the full set.
- [ ] Pagination works: next/previous show different rows, the page indicator is
  correct, and the page size is respected.
- [ ] A filter with no matches shows a readable empty state — not a blank or
  broken table.
- [ ] If row selection is enabled, selecting rows updates the selection state
  and any bulk action operates on exactly the selected rows.
