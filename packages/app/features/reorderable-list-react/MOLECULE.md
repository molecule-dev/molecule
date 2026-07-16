# @molecule/app-reorderable-list-react

Drag-handle reorderable list (HTML5 drag-and-drop).

Exports `<ReorderableList>` and the `ReorderableItem<T>` type
(`{ id: string; data: T }`). Fully controlled: it renders rows and calls
`onReorder(next)` with the complete reordered array — the app owns state.
Props: `items`, `onReorder`, `renderItem(item, isDragging)`,
`renderHandle?` (when set, only the handle is draggable — e.g. a "≡"
glyph; otherwise the whole row drags), `className?`.

## Quick Start

```tsx
import { useState } from 'react'

import { ReorderableList } from '@molecule/app-reorderable-list-react'
import type { ReorderableItem } from '@molecule/app-reorderable-list-react'

function Steps() {
  const [items, setItems] = useState<ReorderableItem<{ label: string }>[]>([
    { id: '1', data: { label: 'First' } },
    { id: '2', data: { label: 'Second' } },
    { id: '3', data: { label: 'Third' } },
  ])
  return (
    <ReorderableList
      items={items}
      onReorder={setItems}
      renderItem={(item) => <span>{item.data.label}</span>}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-reorderable-list-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
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

#### `ReorderableListProps`

Props accepted by the {@link ReorderableList} component.

```typescript
interface ReorderableListProps<T> {
  items: ReorderableItem<T>[]
  /** Called with the new order (full list). */
  onReorder: (next: ReorderableItem<T>[]) => void
  /** Per-item renderer. Receives item + isDragging flag. */
  renderItem: (item: ReorderableItem<T>, isDragging: boolean) => ReactNode
  /** Optional drag-handle slot — when omitted, the entire row is the drag target. */
  renderHandle?: () => ReactNode
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `ReorderableList(props)`

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

- `props` — Component props (see {@link ReorderableListProps}).

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

- Native HTML5 drag events: works with MOUSE/POINTER ONLY. Touch devices
  (iOS/Android) fire no HTML5 drag events, and there is no keyboard
  reordering — add explicit up/down buttons (or a touch-capable drag
  library) when mobile or a11y reordering is required.
- Requires a bonded ClassMap (`setClassMap()` at startup) or rendering
  throws.
- Item `id`s must be unique — drop resolution matches by id.
- The handle's "Drag to reorder" aria-label is hardcoded English.
