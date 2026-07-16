# @molecule/app-related-items-card-react

React card container for cross-linked / related item lists.

Exports `<RelatedItemsCard>` — titled Card with header + list + empty state
+ "View all" link. Use for "Company → Deals", "Contact → Notes",
"Ticket → Related Articles" panels.

Props: `title` (ReactNode), `items: T[]`, `renderItem(item, index)`,
`icon?`, `onItemClick?(item, index)` (rows become clickable),
`emptyState?` (rendered when `items` is empty), `viewAllHref?` (header
"View all" link), `headerActions?` (right-aligned header slot),
`className?`, `dataMolId?`.

## Quick Start

```tsx
import { RelatedItemsCard } from '@molecule/app-related-items-card-react'

interface Article { id: string; title: string }

function RelatedArticles({ articles, onOpen }: {
  articles: Article[]
  onOpen: (id: string) => void
}) {
  return (
    <RelatedItemsCard
      title="Related Articles"
      items={articles}
      viewAllHref="/articles"
      emptyState={<p>No related articles yet.</p>}
      renderItem={(article) => <span>{article.title}</span>}
      onItemClick={(article) => onOpen(article.id)}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-related-items-card-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `RelatedItemsCardProps`

Props accepted by the {@link RelatedItemsCard} component.

```typescript
interface RelatedItemsCardProps<T> {
  /** Card heading. */
  title: ReactNode
  /** Optional leading icon in the header. */
  icon?: ReactNode
  /** Items to render. */
  items: T[]
  /** Render function for each item. */
  renderItem: (item: T, index: number) => ReactNode
  /** Called when an item row is clicked (if applicable). */
  onItemClick?: (item: T, index: number) => void
  /** Rendered when `items` is empty. */
  emptyState?: ReactNode
  /** Optional "View all" link rendered in the header. */
  viewAllHref?: string
  /** Optional right-aligned header actions (e.g. "Add new" button). */
  headerActions?: ReactNode
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

### Functions

#### `RelatedItemsCard(props)`

Card container for a list of cross-linked / related items.

Common usage: "Company → Deals", "Contact → Notes",
"Ticket → Related Articles", "Post → Related Posts". Apps supply the
item data and a renderer; the card provides consistent header +
list + empty-state + view-all chrome.

```typescript
function RelatedItemsCard({
  title,
  icon,
  items,
  renderItem,
  onItemClick,
  emptyState,
  viewAllHref,
  headerActions,
  className,
  dataMolId,
}: RelatedItemsCardProps<T>): JSX.Element
```

- `props` — Component props (see {@link RelatedItemsCardProps}).

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

- Requires a bonded ClassMap — call `setClassMap()` (e.g. with
  `@molecule/app-ui-tailwind`) at startup or rendering throws.
- The "View all" label is hardcoded English (not routed through i18n);
  pass a translated link via `headerActions` in localized apps.
- `onItemClick` rows are mouse-only `<li>` elements (no keyboard handler);
  render a real `<button>`/`<a>` inside `renderItem` when keyboard access
  matters.
- `viewAllHref` renders a plain `<a href>` (full page load in SPA routers);
  use `headerActions` with your router's Link for client-side navigation.
