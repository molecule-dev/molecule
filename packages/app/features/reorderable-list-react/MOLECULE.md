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

## API

### Interfaces

#### `ReorderableItem`

A single item in a ReorderableList, pairing a stable string id with arbitrary data.

```typescript
interface ReorderableItem<T> {
  id: string
  data: T
}
```

### Functions

#### `ReorderableList(root0, root0, root0, root0, root0, root0)`

Drag-handle reorderable list with HTML5 DnD. Apps own the data; this
component only renders + emits new order on `onReorder`.

Use the optional `renderHandle` slot to limit drag to a specific
element (e.g. a "≡" handle on the left).

```typescript
function ReorderableList({
  items,
  onReorder,
  renderItem,
  renderHandle,
  className,
}: ReorderableListProps<T>): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `root0` — *
- `root0` — .items
- `root0` — .onReorder
- `root0` — .renderItem
- `root0` — .renderHandle
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
