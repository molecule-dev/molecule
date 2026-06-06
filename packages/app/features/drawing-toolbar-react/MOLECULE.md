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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
