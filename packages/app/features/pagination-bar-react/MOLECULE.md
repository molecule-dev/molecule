# @molecule/app-pagination-bar-react

React PaginationBar — page-window + "Showing X of Y" text + optional
page-size selector.

Built on `<Button>` and `<Select>` from `@molecule/app-ui-react` so it
inherits the wired ClassMap styling. Apps drive the i18n noun via the
`showingKey` prop ("Showing 1 to 10 of 123 tags" vs. "…orders") — the key
takes `start`, `end`, and `total` interpolation values.

## Quick Start

```tsx
import { useState } from 'react'
import { PaginationBar } from '@molecule/app-pagination-bar-react'

function OrderList({ total }: { total: number }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  return (
    <PaginationBar
      page={page}
      totalPages={Math.max(1, Math.ceil(total / pageSize))}
      pageSize={pageSize}
      total={total}
      onPageChange={setPage}
      pageSizeOptions={[10, 25, 50]}
      onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-pagination-bar-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `PaginationBarProps`

Props for {@link PaginationBar}.

```typescript
interface PaginationBarProps {
  /** Current page (1-indexed). */
  page: number
  /** Total page count (>= 1). */
  totalPages: number
  /** Items per page. */
  pageSize: number
  /** Total item count across all pages. */
  total: number
  /** Called when the user changes page. */
  onPageChange: (page: number) => void
  /** Called when the user changes page-size (when allowed via `pageSizeOptions`). */
  onPageSizeChange?: (size: number) => void
  /** Available page-size options. When omitted, the size selector is hidden. */
  pageSizeOptions?: number[]
  /** i18n key for the "Showing X to Y of Z items" text — takes interpolation vars `start`, `end`, `total`. */
  showingKey?: string
  /** Default English fallback for the showing text. */
  showingDefault?: string
  /** Extra classes on the outer wrapper. */
  className?: string
}
```

### Functions

#### `PaginationBar(props)`

Paginator with a `[showing text, prev, page-window, next, size-select]` layout.

The "Showing X to Y of Z items" text is driven by an i18n key so apps can
specialize the noun ("tags", "orders", "transactions"). Page-size selector
is hidden unless `pageSizeOptions` + `onPageSizeChange` are supplied.

```typescript
function PaginationBar({
  page,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  showingKey = 'pagination.showing',
  showingDefault = 'Showing {{start}} to {{end}} of {{total}} items',
  className,
}: PaginationBarProps): JSX.Element
```

- `props` — Component props (see {@link PaginationBarProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

Companion locale bond: `@molecule/app-locales-pagination-bar` (keys
`pagination.previous`, `pagination.next`, `pagination.pageSize`, plus your
`showingKey`). The page-size `<Select>` is hidden unless BOTH
`pageSizeOptions` and `onPageSizeChange` are supplied. KNOWN ISSUE: the
page-size selector currently wires the `<Select>`'s `onChange` (which
receives the DOM event) instead of `onValueChange`, so every selection
calls `onPageSizeChange` with `NaN` and corrupts the paginator — until the
tracked one-line code fix lands, omit `pageSizeOptions`/`onPageSizeChange`
(hiding the selector) rather than relying on it. Requires the app-react
i18n provider and a wired ClassMap bond. Distinct from
`@molecule/app-ui-react`'s lower-level `<Pagination>` (page window only —
no showing-text or size selector).

## Translations

Translation strings are provided by `@molecule/app-locales-pagination-bar`.
