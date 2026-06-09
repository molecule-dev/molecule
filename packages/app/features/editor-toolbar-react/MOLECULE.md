# @molecule/app-editor-toolbar-react

React editor-top toolbar.

Exports `<EditorToolbar>` — title + badge + primary/secondary actions.

## Quick Start

```tsx
import { EditorToolbar } from '@molecule/app-editor-toolbar-react'

<EditorToolbar
  title="My Blog Post"
  badge={<span>Draft</span>}
  primaryActions={[
    { id: 'save', label: 'Save', onClick: () => save(), variant: 'outline' },
    { id: 'publish', label: 'Publish', onClick: () => publish(), variant: 'solid', color: 'primary' },
  ]}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-editor-toolbar-react
```

## API

### Interfaces

#### `ToolbarAction`

A single action item rendered as a button (or linked button) in the toolbar.

```typescript
interface ToolbarAction {
  id: string
  label: ReactNode
  icon?: ReactNode
  onClick?: () => void
  href?: string
  disabled?: boolean
  /** Visual variant — defaults to 'ghost'. */
  variant?: 'solid' | 'outline' | 'ghost' | 'link'
  /** Optional color variant for emphasis. */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
}
```

### Functions

#### `EditorToolbar(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Editor-page top toolbar — title + optional version/status badge +
primary actions (Save, Publish, Test) + secondary icon actions.

Pair with `<EditorLayout>` from `@molecule/app-editor-layout-react` as
the `topBar` slot.

```typescript
function EditorToolbar({
  title,
  badge,
  primaryActions = [],
  secondaryActions = [],
  leading,
  sticky = true,
  className,
  dataMolId,
}: EditorToolbarProps): JSX.Element
```

- `root0` — *
- `root0` — .title
- `root0` — .badge
- `root0` — .primaryActions
- `root0` — .secondaryActions
- `root0` — .leading
- `root0` — .sticky
- `root0` — .className
- `root0` — .dataMolId

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
