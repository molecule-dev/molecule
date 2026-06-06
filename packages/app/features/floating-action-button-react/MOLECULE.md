# @molecule/app-floating-action-button-react

React floating action button (FAB).

Exports `<FloatingActionButton>` — fixed-position circular button or link
with icon, tooltip, and corner positioning.

## Quick Start

```tsx
import { FloatingActionButton } from '@molecule/app-floating-action-button-react'
import { Icon } from '@molecule/app-ui-react'

<FloatingActionButton
  icon={<Icon name="plus" size={24} />}
  label="Create new item"
  position="bottom-right"
  onClick={() => setCreateOpen(true)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-floating-action-button-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
