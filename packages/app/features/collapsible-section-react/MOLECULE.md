# @molecule/app-collapsible-section-react

React collapsible-section and show-more.

Exports:
- `<CollapsibleSection>` — expandable section with clickable heading.
- `<ShowMore>` — "Show N more" / "Show less" toggle for long lists.

## Quick Start

```tsx
import { CollapsibleSection, ShowMore } from '@molecule/app-collapsible-section-react'

<CollapsibleSection title="Key concepts" defaultExpanded={true}>
  <p>Content revealed when expanded.</p>
</CollapsibleSection>

<ShowMore initialCount={3}>
  {items.map((item) => <div key={item.id}>{item.label}</div>)}
</ShowMore>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-collapsible-section-react
```

## API

### Functions

#### `CollapsibleSection(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Expandable section with a clickable heading. Lighter-weight than
`<Accordion>` — renders a single toggle, not a group of panels.

Typical uses: "Key concepts" in lesson pages, filter groups in a
sidebar, FAQ rows, disclosure in settings.

```typescript
function CollapsibleSection({
  title,
  children,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  badge,
  actions,
  level = 3,
  className,
}: CollapsibleSectionProps): JSX.Element
```

- `root0` — *
- `root0` — .title
- `root0` — .children
- `root0` — .expanded
- `root0` — .defaultExpanded
- `root0` — .onExpandedChange
- `root0` — .badge
- `root0` — .actions
- `root0` — .level
- `root0` — .className

#### `ShowMore(root0, root0, root0, root0, root0, root0)`

"Show N more" / "Show less" toggle. Simpler than `<CollapsibleSection>`
when you just want to truncate a long list.

```typescript
function ShowMore({
  children,
  initialCount = 3,
  moreKey = 'showMore.more',
  lessKey = 'showMore.less',
  className,
}: ShowMoreProps): JSX.Element
```

- `root0` — *
- `root0` — .children
- `root0` — .initialCount
- `root0` — .moreKey
- `root0` — .lessKey
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
