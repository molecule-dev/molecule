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
npm install @molecule/app-collapsible-section-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `CollapsibleSectionProps`

```typescript
interface CollapsibleSectionProps {
  /** Section heading — rendered as an expand-toggle button. */
  title: ReactNode
  /** Body to show when expanded. */
  children: ReactNode
  /** Controlled expansion — if omitted, the component owns state. */
  expanded?: boolean
  /** Initial expanded state when uncontrolled. Defaults to false. */
  defaultExpanded?: boolean
  /** Called when expansion state changes. */
  onExpandedChange?: (expanded: boolean) => void
  /** Optional badge / count shown in the header. */
  badge?: ReactNode
  /** Optional right-side actions. */
  actions?: ReactNode
  /** Heading level — affects rendered tag, defaults to 3. */
  level?: 2 | 3 | 4 | 5 | 6
  /** Extra classes. */
  className?: string
}
```

#### `ShowMoreProps`

```typescript
interface ShowMoreProps {
  /** Items before truncation. */
  children: ReactNode[]
  /** Number to show initially. Defaults to 3. */
  initialCount?: number
  /** i18n key for the "Show more" label — receives `{ remaining }`. */
  moreKey?: string
  /** i18n key for the "Show less" label. */
  lessKey?: string
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `CollapsibleSection(props)`

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

- `props` — Component props (see {@link CollapsibleSectionProps}).

#### `ShowMore(props)`

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

- `props` — Component props (see {@link CollapsibleSectionProps}).

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

`<CollapsibleSection>` is uncontrolled by default (`defaultExpanded`);
passing `expanded` makes it fully controlled — then you must update it from
`onExpandedChange`. The header renders as a single `<button>`, so anything
passed to `actions` must NOT contain buttons/links (nested interactive
elements are invalid HTML) — put row actions outside the section instead.
`<ShowMore>`'s labels use the i18n keys `showMore.more` / `showMore.less`
with English `defaultValue`s; no companion locale bond ships these keys —
add them to your app's locale resources (or pass custom `moreKey`/`lessKey`).
