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

## Quick Start

```tsx
import { KanbanBoard } from '@molecule/app-kanban-board-react'

<KanbanBoard
  columns={[
    { id: 'todo', title: 'To Do', cards: [{ id: 'c1', title: 'Research API' }] },
    { id: 'doing', title: 'In Progress', accent: 'primary', cards: [{ id: 'c2', title: 'Build UI' }] },
    { id: 'done', title: 'Done', accent: 'success', cards: [] },
  ]}
  onCardMove={(cardId, fromColumnId, toColumnId) => moveCard(cardId, toColumnId)}
  onCardClick={(card, column) => openCardDetail(card.id)}
/>
```

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

Data for a single kanban column, including its heading, optional accent, and ordered card list.

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

### Functions

#### `KanbanBoard(root0, root0, root0, root0, root0, root0, root0)`

Kanban board with HTML5 drag-drop between columns.

Pure UI — consumers own the card data and call back on `onCardMove`
to persist reorder. For fancier drag experiences, wire
`@molecule/app-drag-drop` at the column level instead.

```typescript
function KanbanBoard({
  columns,
  onCardMove,
  onCardClick,
  renderHeaderActions,
  renderFooter,
  className,
}: KanbanBoardProps): JSX.Element
```

- `root0` — *
- `root0` — .columns
- `root0` — .onCardMove
- `root0` — .onCardClick
- `root0` — .renderHeaderActions
- `root0` — .renderFooter
- `root0` — .className

#### `KanbanCard(root0, root0, root0, root0, root0)`

Single card inside a Kanban column. Drag-drop is opt-in via the
`onDragStart` prop — wire it to the `@molecule/app-drag-drop` bond or
HTML5 drag-drop directly.

The outer `<div>` wrapper carries the drag handlers so we don't rely
on `<Card>` forwarding drag events (which it doesn't).

```typescript
function KanbanCard({
  card,
  onClick,
  onDragStart,
  className,
}: KanbanCardProps): JSX.Element
```

- `root0` — *
- `root0` — .card
- `root0` — .onClick
- `root0` — .onDragStart
- `root0` — .className

#### `KanbanColumn(root0, root0, root0, root0, root0, root0, root0, root0)`

One Kanban column — sticky header + scrollable card list + optional footer.

```typescript
function KanbanColumn({
  column,
  onCardClick,
  onDrop,
  onCardDragStart,
  headerActions,
  footer,
  className,
}: KanbanColumnProps): JSX.Element
```

- `root0` — *
- `root0` — .column
- `root0` — .onCardClick
- `root0` — .onDrop
- `root0` — .onCardDragStart
- `root0` — .headerActions
- `root0` — .footer
- `root0` — .className

#### `KanbanColumnHeader(root0, root0, root0, root0, root0)`

Kanban column heading row — title + count + right actions.

```typescript
function KanbanColumnHeader({
  title,
  count,
  actions,
  className,
}: KanbanColumnHeaderProps): JSX.Element
```

- `root0` — *
- `root0` — .title
- `root0` — .count
- `root0` — .actions
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
