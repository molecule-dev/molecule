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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
