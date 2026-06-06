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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
