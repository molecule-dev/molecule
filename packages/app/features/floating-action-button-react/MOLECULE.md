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

## API

### Functions

#### `FloatingActionButton(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Fixed-position circular action button. Renders either an anchor (when
`href` is set) or a button (when `onClick` is set). Positioning is
inline-style so the component works without extra CSS setup.

```typescript
function FloatingActionButton({
  icon,
  label,
  onClick,
  href,
  position = 'bottom-right',
  size = 'md',
  showTooltip = true,
  className,
}: FloatingActionButtonProps): JSX.Element
```

- `root0` — *
- `root0` — .icon
- `root0` — .label
- `root0` — .onClick
- `root0` — .href
- `root0` — .position
- `root0` — .size
- `root0` — .showTooltip
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
