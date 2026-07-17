# @molecule/app-reorderable-list-react

Drag-handle reorderable list (HTML5 drag-and-drop).

Exports `<ReorderableList>` and the `ReorderableItem<T>` type
(`{ id: string; data: T }`). Fully controlled: it renders rows and calls
`onReorder(next)` with the complete reordered array — the app owns state.
Props: `items`, `onReorder`, `renderItem(item, isDragging)`,
`renderHandle?` (when set, only the handle is draggable — e.g. a "≡"
glyph; otherwise the whole row drags), `className?`.

Reordering works with a mouse (HTML5 drag) AND the keyboard: every row has
move-up/move-down buttons (`data-mol-id="reorderable-move-{up,down}-<id>"`),
and a focused row responds to Alt+ArrowUp / Alt+ArrowDown.

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

Drag-handle reorderable list with HTML5 DnD AND keyboard reordering. Apps own
the data; this component only renders + emits new order on `onReorder`.

Use the optional `renderHandle` slot to limit drag to a specific
element (e.g. a "≡" handle on the left). Every row also ships explicit
move-up/move-down buttons and supports Alt+ArrowUp / Alt+ArrowDown on the
focused row, so the list is fully reorderable without a mouse.

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

- Native HTML5 drag works with MOUSE/POINTER only — touch devices
  (iOS/Android) fire no HTML5 drag events. The keyboard path (move buttons +
  Alt+Arrow) is the a11y/touch-safe fallback and is always present; add a
  pointer/touch drag library only if you also need touch DRAG specifically.
- Requires a bonded ClassMap (`setClassMap()` at startup) and an
  `<I18nProvider>` (for the control labels) or rendering throws.
- Item `id`s must be unique — drop resolution matches by id.
- Control labels ("Move up/down", "Drag to reorder", row position) render
  through `t(...)` with English defaults; no companion locale bond ships yet,
  so translate them by wiring a `reorderableList.*` bond when needed.
