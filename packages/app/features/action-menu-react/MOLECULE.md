# @molecule/app-action-menu-react

Kebab / overflow action menu.

Exports `<ActionMenu>` — compact popover menu with close-on-outside-click
and Escape key support. `ActionMenuItem` type.

## Quick Start

```tsx
import { ActionMenu } from '@molecule/app-action-menu-react'

<ActionMenu
  items={[
    { id: 'edit', label: 'Edit', onClick: () => console.log('edit') },
    { id: 'duplicate', label: 'Duplicate', onClick: () => console.log('duplicate'), divider: true },
    { id: 'delete', label: 'Delete', onClick: () => console.log('delete'), destructive: true },
  ]}
  align="right"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-action-menu-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `ActionMenuItem`

A single item in the ActionMenu list.

```typescript
interface ActionMenuItem {
  /** Unique id. */
  id: string
  /** Label. */
  label: ReactNode
  /** Optional leading icon. */
  icon?: ReactNode
  /** Click handler. */
  onClick?: () => void
  /** Href — when present, item renders as an anchor instead of a button. */
  href?: string
  /** When true, rendered in a disabled state. */
  disabled?: boolean
  /** Mark the item as destructive (uses error color accent). */
  destructive?: boolean
  /** Insert a divider below this item. */
  divider?: boolean
}
```

### Functions

#### `ActionMenu(root0, root0, root0, root0, root0, root0)`

Compact overflow / kebab menu button that opens a popover list of
actions on click. Closes on outside-click and Escape.

Pure uncontrolled — the component manages its own open state. For
external control, use `<Dropdown>` from `@molecule/app-ui-react`.

```typescript
function ActionMenu({
  items,
  trigger,
  align = 'right',
  triggerAriaLabel = 'Actions',
  className,
}: ActionMenuProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `root0` — *
- `root0` — .items
- `root0` — .trigger
- `root0` — .align
- `root0` — .triggerAriaLabel
- `root0` — .className

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
