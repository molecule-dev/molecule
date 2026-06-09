# @molecule/app-pagination-bar-react

React PaginationBar — page-window + "Showing X of Y" text + optional page-size selector.

Built on top of `<Button>` and `<Select>` from `@molecule/app-ui-react`
so it inherits the wired ClassMap styling. Apps drive the i18n noun via
the `showingKey` prop ("Showing 1 to 10 of 123 tags" vs. "…orders").

## Quick Start

```tsx
import { PaginationBar } from '@molecule/app-pagination-bar-react'

<PaginationBar
  page={currentPage}
  totalPages={Math.ceil(total / pageSize)}
  pageSize={pageSize}
  total={total}
  onPageChange={(p) => setCurrentPage(p)}
  pageSizeOptions={[10, 25, 50]}
  onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1) }}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-pagination-bar-react
```

## API

### Functions

#### `PaginationBar(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .page
- `root0` — .totalPages
- `root0` — .pageSize
- `root0` — .total
- `root0` — .onPageChange
- `root0` — .onPageSizeChange
- `root0` — .pageSizeOptions
- `root0` — .showingKey
- `root0` — .showingDefault
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
