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
npm install @molecule/app-breadcrumb-react
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

### Functions

#### `Breadcrumb(root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .items
- `root0` — .onNavigate
- `root0` — .separator
- `root0` — .className
- `root0` — .dataMolId

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
