# @molecule/app-kanban-board-react

React Kanban board primitives (pure presentational — you own the data).

Exports:
- `<KanbanBoard>` — columns side-by-side with HTML5 drag-drop between columns.
  Props: `columns`, `onCardMove?(cardId, fromColumnId, toColumnId)`,
  `onCardClick?(card, column)`, `renderHeaderActions?(column)`,
  `renderFooter?(column)`, `className?`.
- `<KanbanColumn>` / `<KanbanColumnHeader>` / `<KanbanCard>` — the building blocks,
  usable standalone for custom board layouts.
- `KanbanColumnData` (`{ id, title, accent?, cards }`), `KanbanCardData`
  (`{ id, title, body?, footer? }`) types.

This package is standalone UI: it does NOT use the headless
`@molecule/app-kanban` core or the `app-kanban-default` bond. Reach for those
when you want board STATE management (move/add/remove logic) behind a bond;
use this package when you just need the rendered board and will persist moves
yourself in `onCardMove`.

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
npm install @molecule/app-kanban-board-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `KanbanBoardProps`

```typescript
interface KanbanBoardProps {
  columns: KanbanColumnData[]
  /** Called when a card moves from one column to another. */
  onCardMove?: (cardId: string, fromColumnId: string, toColumnId: string) => void
  /** Called when a card is clicked. */
  onCardClick?: (card: KanbanCardData, column: KanbanColumnData) => void
  /** Optional per-column header action renderer. */
  renderHeaderActions?: (column: KanbanColumnData) => ReactNode
  /** Optional per-column footer renderer (e.g. "+ Add card"). */
  renderFooter?: (column: KanbanColumnData) => ReactNode
  /** Extra classes on the outer board wrapper. */
  className?: string
}
```

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

#### `KanbanCardProps`

```typescript
interface KanbanCardProps {
  card: KanbanCardData
  /** Called when the card is clicked (e.g. open detail modal). */
  onClick?: (card: KanbanCardData) => void
  /** HTML5 drag start — integrate with `@molecule/app-drag-drop` bond. */
  onDragStart?: (card: KanbanCardData, e: DragEvent<HTMLDivElement>) => void
  /** Extra classes. */
  className?: string
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

#### `KanbanColumnHeaderProps`

```typescript
interface KanbanColumnHeaderProps {
  title: ReactNode
  /** Card count shown in parentheses. */
  count?: number
  /** Optional right-side actions (add card button, menu). */
  actions?: ReactNode
  /** Extra classes. */
  className?: string
}
```

#### `KanbanColumnProps`

```typescript
interface KanbanColumnProps {
  column: KanbanColumnData
  /** Called when a card is clicked. */
  onCardClick?: (card: KanbanCardData, column: KanbanColumnData) => void
  /** Called when a card is dragged into this column. */
  onDrop?: (column: KanbanColumnData, e: React.DragEvent) => void
  /** Called when a card drag-start fires. */
  onCardDragStart?: (card: KanbanCardData, column: KanbanColumnData, e: React.DragEvent) => void
  /** Optional header actions. */
  headerActions?: ReactNode
  /** Optional footer (e.g. "Add card" button). */
  footer?: ReactNode
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `KanbanBoard(props)`

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

- `props` — Component props (see {@link KanbanBoardProps}).

#### `KanbanCard(props)`

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

- `props` — Component props (see {@link KanbanCardProps}).

#### `KanbanColumn(props)`

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

- `props` — Component props (see {@link KanbanColumnProps}).

#### `KanbanColumnHeader(props)`

Kanban column heading row — title + count + right actions.

```typescript
function KanbanColumnHeader({
  title,
  count,
  actions,
  className,
}: KanbanColumnHeaderProps): JSX.Element
```

- `props` — Component props (see {@link KanbanColumnHeaderProps}).

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

- Drag-drop is native HTML5 DnD: it does not fire on touch devices — provide
  an alternate affordance (e.g. a move menu in `renderHeaderActions`) for mobile.
- `onCardMove` fires only when a card is dropped on a DIFFERENT column, and no
  insertion index is reported — same-column reordering is not supported; movers
  can only append to the target column.
- Consumers own the data: update your `columns` state in `onCardMove` or the
  board will snap back on re-render.
- `accent` on a column is currently cosmetic metadata only.
- Styling resolves through `getClassMap()`; `<KanbanCard>` uses `<Card>` from
  `@molecule/app-ui-react` — wire a ClassMap bond first.
