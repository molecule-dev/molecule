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
  /**
   * Marks the item as destructive. Rendered in the theme's error color
   * (`cm.textError`) with semibold weight, so it reads as red in both light
   * and dark themes.
   */
  destructive?: boolean
  /** Insert a divider below this item. */
  divider?: boolean
}
```

#### `ActionMenuProps`

Props for the {@link ActionMenu} component.

```typescript
interface ActionMenuProps {
  /** Items to render. */
  items: ActionMenuItem[]
  /** Trigger content — usually a kebab icon. Defaults to "⋮". */
  trigger?: ReactNode
  /** Menu alignment relative to the trigger. Defaults to `'right'`. */
  align?: 'left' | 'right'
  /** Accessible label for the trigger button. */
  triggerAriaLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string
}
```

### Functions

#### `ActionMenu(props)`

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

- `props` — Component props (see {@link ActionMenuProps}).

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
