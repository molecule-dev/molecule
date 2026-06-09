# @molecule/app-bulk-action-toolbar-react

Selection-aware bulk action toolbar.

Exports `<BulkActionToolbar>` and `BulkAction` type.

## Quick Start

```tsx
import { BulkActionToolbar } from '@molecule/app-bulk-action-toolbar-react'

<BulkActionToolbar
  count={selectedIds.length}
  actions={[
    { id: 'delete', label: 'Delete', onClick: () => handleDelete(selectedIds), destructive: true },
    { id: 'export', label: 'Export', onClick: () => handleExport(selectedIds) },
  ]}
  onClearSelection={() => setSelectedIds([])}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-bulk-action-toolbar-react
```

## API

### Interfaces

#### `BulkAction`

Descriptor for a single action button rendered inside BulkActionToolbar.

```typescript
interface BulkAction {
  id: string
  label: ReactNode
  icon?: ReactNode
  onClick: () => void
  destructive?: boolean
  disabled?: boolean
}
```

### Functions

#### `BulkActionToolbar(root0, root0, root0, root0, root0, root0)`

Selection-aware bulk action bar — appears when the user has selected
one or more rows, shows the count + a row of action buttons + a
"Clear selection" link.

```typescript
function BulkActionToolbar({
  count,
  actions,
  onClearSelection,
  position = 'sticky-bottom',
  className,
}: BulkActionToolbarProps): ReactElement<unknown, string | JSXElementConstructor<any>> | null
```

- `root0` — *
- `root0` — .count
- `root0` — .actions
- `root0` — .onClearSelection
- `root0` — .position
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
