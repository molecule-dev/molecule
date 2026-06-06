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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
