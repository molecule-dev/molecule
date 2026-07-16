# @molecule/app-floating-action-button-react

React floating action button (FAB).

Exports `<FloatingActionButton>` — fixed-position circular button
(or anchor when `href` is set) with an icon slot, native-title
tooltip, and four corner-anchoring positions.

## Quick Start

```tsx
import { FloatingActionButton } from '@molecule/app-floating-action-button-react'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '@molecule/app-ui-react'

function CreateFab() {
  const cm = getClassMap()
  return (
    <FloatingActionButton
      icon={<Icon name="plus" size={24} />}
      label="Create new item"
      position="bottom-right"
      onClick={() => setCreateOpen(true)}
      className={cm.surface}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-floating-action-button-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `FloatingActionButtonProps`

```typescript
interface FloatingActionButtonProps {
  /** Icon rendered inside the FAB. */
  icon: ReactNode
  /** Accessible label / tooltip text (usually `t('...')`). */
  label: string
  /** Click handler (mutually exclusive with `href`). */
  onClick?: () => void
  /** Navigation target (mutually exclusive with `onClick`). */
  href?: string
  /** Screen corner for anchoring. Defaults to `'bottom-right'`. */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  /** Visual size. */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show the label on hover. Defaults to true. */
  showTooltip?: boolean
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `FloatingActionButton(props)`

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

- `props` — Component props (see {@link FloatingActionButtonProps}).

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

The FAB ships with NO default background, border, or shadow — pass
surface styling via `className` (e.g. the ClassMap `surface` class
plus your shadow utility) or the button renders as a transparent
circle over the page.

`label` doubles as an i18n key: it is resolved through
`t(label, {}, { defaultValue: label })`, so passing a translation key
localizes the aria-label / tooltip, and plain English strings still
work as their own fallback. The tooltip is the native `title`
attribute (no styled tooltip component).

`href` and `onClick` are mutually exclusive — when `href` is set an
`<a>` renders and `onClick` is ignored.
