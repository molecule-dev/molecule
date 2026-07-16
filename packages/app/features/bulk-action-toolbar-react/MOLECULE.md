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
npm install @molecule/app-bulk-action-toolbar-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
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

#### `BulkActionToolbarProps`

```typescript
interface BulkActionToolbarProps {
  /** Selection count — toolbar hides when 0. */
  count: number
  /** Action buttons. */
  actions: BulkAction[]
  /** Called when "Clear selection" is clicked. */
  onClearSelection?: () => void
  /** Position — `'sticky-bottom'` (default), `'sticky-top'`, or `'inline'`. */
  position?: 'sticky-bottom' | 'sticky-top' | 'inline'
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `BulkActionToolbar(props)`

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

- `props` — Component props (see {@link BulkActionToolbarProps}).

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

Renders `null` while `count <= 0` — mount it unconditionally and drive
it from selection state. `position` defaults to `'sticky-bottom'`
(16px inset, z-30); `'sticky-top'` and `'inline'` are also supported.
Destructive actions render as solid error-colored buttons. The count
label and Clear button are translated via the companion
`@molecule/app-locales-bulk-action-toolbar` locale bond.

## Translations

Translation strings are provided by `@molecule/app-locales-bulk-action-toolbar`.
