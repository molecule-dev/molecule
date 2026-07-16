# @molecule/app-drawing-toolbar-react

Whiteboard / canvas / annotation tool selector.

Exports `<DrawingToolbar>` (a `role="toolbar"` row/column of toggle
buttons) and the `DrawingTool` type. Selection is controlled: pass
`selectedId` + `onSelect`.

## Quick Start

```tsx
import { useState } from 'react'
import { DrawingToolbar } from '@molecule/app-drawing-toolbar-react'

const [tool, setTool] = useState('select')

<DrawingToolbar
  tools={[
    { id: 'select', label: 'Select', icon: '↖' },
    { id: 'pen', label: 'Pen', icon: '✎' },
    { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  ]}
  selectedId={tool}
  onSelect={setTool}
  orientation="horizontal"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-drawing-toolbar-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `DrawingTool`

A single drawing tool entry rendered as a toolbar button.

```typescript
interface DrawingTool {
  id: string
  label: string
  icon?: ReactNode
}
```

#### `DrawingToolbarProps`

```typescript
interface DrawingToolbarProps {
  /** Tools to render. */
  tools: DrawingTool[]
  /** Currently selected tool id. */
  selectedId: string
  /** Called when the user picks a tool. */
  onSelect: (id: string) => void
  /** Optional extra controls (color picker, stroke width). */
  extras?: ReactNode
  /** Layout — default `'horizontal'`. Set `'vertical'` for left-rail toolbars. */
  orientation?: 'horizontal' | 'vertical'
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `DrawingToolbar(props)`

Whiteboard / canvas / annotation tool selector. Defaults to a
standard set of tools (select, rectangle, ellipse, arrow, text,
sticky, pen, eraser) but apps can pass any list.

```typescript
function DrawingToolbar({
  tools = DEFAULT_TOOLS,
  selectedId,
  onSelect,
  extras,
  orientation = 'horizontal',
  className,
}: DrawingToolbarProps): JSX.Element
```

- `props` — Component props (see {@link DrawingToolbarProps}).

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

- `tools` is REQUIRED by the type — always pass your own list, with
  `label` already translated via your `t()` call (labels feed each
  button's `aria-label` and `title` verbatim).
- The toolbar's own aria-label resolves through `t('drawingToolbar.label')`
  with an English fallback; companion locale bond:
  `@molecule/app-locales-drawing-toolbar`.
- When a tool has no `icon`, the first character of `label` is shown.
- `extras` renders after the tool buttons — drop in color pickers or
  stroke-width controls.
- Buttons come from `@molecule/app-ui-react`; requires a wired ClassMap
  bond and the app I18nProvider (standard molecule app setup).

## Translations

Translation strings are provided by `@molecule/app-locales-drawing-toolbar`.
