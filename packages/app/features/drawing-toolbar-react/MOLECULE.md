# @molecule/app-drawing-toolbar-react

Whiteboard / canvas / annotation tool selector.

Exports `<DrawingToolbar>` and `DrawingTool` type.

## Quick Start

```tsx
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
npm install @molecule/app-drawing-toolbar-react
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

### Functions

#### `DrawingToolbar(root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .tools
- `root0` — .selectedId
- `root0` — .onSelect
- `root0` — .extras
- `root0` — .orientation
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
