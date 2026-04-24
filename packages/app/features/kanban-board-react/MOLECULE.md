# @molecule/app-kanban-board-react

React Kanban board primitives.

Exports:
- `<KanbanBoard>` — top-level board with HTML5 drag-drop between columns.
- `<KanbanColumn>` — one column (header + card list + optional footer).
- `<KanbanColumnHeader>` — title + count + actions row.
- `<KanbanCard>` — single draggable card.
- `KanbanColumnData`, `KanbanCardData` types.

Use the simple HTML5 DnD built into `<KanbanBoard>` or wire
`@molecule/app-drag-drop` at the column level for fancier
interactions (touch, keyboard, animated reorder).

## Type
`feature`

## Installation
```bash
npm install @molecule/app-kanban-board-react
```

## API

### Interfaces

#### `KanbanCardData`

Kanban board types.

```typescript
interface KanbanCardData {
  /** Card id. */
  id: string
  /** Title / summary. */
  title: ReactNode
  /** Optional body / description. */
  body?: ReactNode
  /** Optional footer row (avatars, tags, timestamps). */
  footer?: ReactNode
}
```

#### `KanbanColumnData`

```typescript
interface KanbanColumnData {
  /** Column id. */
  id: string
  /** Column heading. */
  title: ReactNode
  /** Optional accent color token. */
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  /** Cards in the column, in display order. */
  cards: KanbanCardData[]
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
