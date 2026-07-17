# @molecule/app-breadcrumb-react

React breadcrumb navigation component.

Exports `<Breadcrumb>` — a list of crumbs where each but the last is a
link. The final crumb renders as plain text with `aria-current="page"`.
Pass `onNavigate` to intercept clicks and hand off to a router.

## Quick Start

```tsx
import { Breadcrumb } from '@molecule/app-breadcrumb-react'
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()

<Breadcrumb
  items={[
    { label: 'Home', to: '/' },
    { label: 'Projects', to: '/projects' },
    { label: 'Apollo Redesign' },
  ]}
  onNavigate={(to) => navigate(to)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-breadcrumb-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `BreadcrumbItem`

Describes a single crumb entry in a breadcrumb trail.

```typescript
interface BreadcrumbItem {
  /** Display text or React node for the crumb. */
  label: ReactNode
  /**
   * Optional `to` target. When absent the crumb renders as plain text
   * (typically the current page).
   */
  to?: string
  /** Optional leading icon. */
  icon?: ReactNode
}
```

#### `BreadcrumbProps`

```typescript
interface BreadcrumbProps {
  /** Ordered list of crumbs, last one usually the current page. */
  items: BreadcrumbItem[]
  /**
   * Click handler invoked with the target `to` when an item is clicked.
   * Useful when wiring to `react-router-dom`'s `useNavigate`. When
   * omitted the component renders items with an anchor `<a href={to}>`.
   */
  onNavigate?: (to: string) => void
  /** Separator between crumbs — defaults to a `/`. Accepts any node. */
  separator?: ReactNode
  /** Extra classes on the `<nav>` element. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

### Functions

#### `Breadcrumb(props)`

Breadcrumb navigation.

Each item before the last is rendered as a link; the last item is
rendered as plain text (the "current page"). Pass `onNavigate` to
intercept clicks (e.g. hand off to `useNavigate()` from react-router).

```typescript
function Breadcrumb({
  items,
  onNavigate,
  separator,
  className,
  dataMolId,
}: BreadcrumbProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props (see {@link BreadcrumbProps}).

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

Without `onNavigate`, crumbs render as plain `<a href>` (full page
load in SPAs) — pass `onNavigate={(to) => navigate(to)}` to stay
client-side; with it, crumbs render as `<button>`s. The last item (or
any item without `to`) renders as plain text with `aria-current="page"`.
No router dependency is required by the component itself.
