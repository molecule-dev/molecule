# @molecule/app-reorderable-list-react

Drag-handle reorderable list.

Exports `<ReorderableList>` and `ReorderableItem` type.

## Quick Start

```tsx
import { ReorderableList } from '@molecule/app-reorderable-list-react'
import type { ReorderableItem } from '@molecule/app-reorderable-list-react'

const [items, setItems] = useState<ReorderableItem<{ label: string }>[]>([
  { id: '1', data: { label: 'First' } },
  { id: '2', data: { label: 'Second' } },
  { id: '3', data: { label: 'Third' } },
])

<ReorderableList
  items={items}
  onReorder={setItems}
  renderItem={(item) => <span>{item.data.label}</span>}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-reorderable-list-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
