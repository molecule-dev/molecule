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
npm install @molecule/app-action-menu-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
