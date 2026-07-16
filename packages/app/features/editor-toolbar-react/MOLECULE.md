# @molecule/app-editor-toolbar-react

React editor-top toolbar.

Exports `<EditorToolbar>` — title + badge + primary/secondary action
groups — and the `ToolbarAction` shape. Pair with `<EditorLayout>` from
`@molecule/app-editor-layout-react` as its `topBar` slot.

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
npm install @molecule/app-editor-toolbar-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `EditorToolbarProps`

```typescript
interface EditorToolbarProps {
  /** Document title. */
  title: ReactNode
  /** Optional version / status badge next to the title. */
  badge?: ReactNode
  /** Primary actions (e.g. Save, Publish) rendered on the right. */
  primaryActions?: ToolbarAction[]
  /** Secondary icon-only actions (theme, settings, help). */
  secondaryActions?: ToolbarAction[]
  /** Optional leading slot (back button, breadcrumb). */
  leading?: ReactNode
  /** Sticky top — defaults to true. */
  sticky?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

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

#### `EditorToolbar(props)`

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

- `props` — Component props (see {@link EditorToolbarProps}).

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

- `sticky` defaults to TRUE and applies `position: sticky; top: 0` with
  a TRANSPARENT background — pass a surface class via `className` or
  page content will scroll visibly through the toolbar.
- Action `label`s render verbatim (into the button and nothing else) —
  pass already-translated strings; the component has no `t()` calls or
  locale bond of its own.
- Prefer `onClick` over `href`: an `href` action wraps the button in a
  plain anchor (full page navigation, and invalid button-in-anchor
  nesting for assistive tech).
- A 1px divider renders between the primary and secondary groups only
  when both are non-empty.
- Buttons come from `@molecule/app-ui-react`; requires a wired ClassMap
  bond (standard molecule app setup).
