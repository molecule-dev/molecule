# @molecule/app-related-items-card-react

React card container for cross-linked / related item lists.

Exports `<RelatedItemsCard>` — titled Card with header + list + empty state + "View all" link.
Use for "Company → Deals", "Contact → Notes", "Ticket → Related Articles" panels.

## Quick Start

```tsx
import { RelatedItemsCard } from '@molecule/app-related-items-card-react'

<RelatedItemsCard
  title="Related Articles"
  items={articles}
  viewAllHref="/articles"
  emptyState={<p>No related articles yet.</p>}
  renderItem={(article) => (
    <span>{article.title}</span>
  )}
  onItemClick={(article) => navigate(`/articles/${article.id}`)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-related-items-card-react
```

## API

### Functions

#### `RelatedItemsCard(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .title
- `root0` — .icon
- `root0` — .items
- `root0` — .renderItem
- `root0` — .onItemClick
- `root0` — .emptyState
- `root0` — .viewAllHref
- `root0` — .headerActions
- `root0` — .className
- `root0` — .dataMolId

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
