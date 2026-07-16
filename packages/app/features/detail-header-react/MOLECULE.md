# @molecule/app-detail-header-react

React detail-page header.

Exports `<DetailHeader>` — leading slot + title/subtitle + status +
right-aligned actions, with an optional meta row and an optional search
slot. Different from `<PageHeader>` (top of list/index pages) in
prioritising status + search + stickiness for long-scrolling detail
screens. All slots are ReactNode props — compose any components.

## Quick Start

```tsx
import { DetailHeader } from '@molecule/app-detail-header-react'
import { Button } from '@molecule/app-ui-react'
import { StatusBadge } from '@molecule/app-status-badge-react'

<DetailHeader
  title="Project Alpha"
  subtitle="Last updated 2 hours ago"
  status={<StatusBadge kind="success">Active</StatusBadge>}
  actions={<Button variant="solid" onClick={handleEdit}>Edit</Button>}
  meta={<span>Owner: Alice</span>}
  sticky
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-detail-header-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `DetailHeaderProps`

```typescript
interface DetailHeaderProps {
  /** Primary heading. */
  title: ReactNode
  /** Optional subtitle shown below the title. */
  subtitle?: ReactNode
  /** Optional leading avatar / icon / logo. */
  leading?: ReactNode
  /** Optional status indicator (e.g. `<StatusBadge>` or `<StatusPill>`). */
  status?: ReactNode
  /** Right-aligned actions. */
  actions?: ReactNode
  /** Optional metadata row rendered below the main row (chips / secondary fields). */
  meta?: ReactNode
  /** Optional search slot (rendered to the left of the actions). */
  search?: ReactNode
  /** Whether to render with a sticky-top style (position: sticky). */
  sticky?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

### Functions

#### `DetailHeader(props)`

Header row for a detail page — leading slot + title/subtitle + status +
actions, with optional meta row and search slot.

Different from `<PageHeader>` (used at the top of list/index pages)
in prioritising status + search + stickiness.

```typescript
function DetailHeader({
  title,
  subtitle,
  leading,
  status,
  actions,
  meta,
  search,
  sticky,
  className,
  dataMolId,
}: DetailHeaderProps): JSX.Element
```

- `props` — Component props (see {@link DetailHeaderProps}).

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

- `sticky` applies `position: sticky; top: 0` but adds NO background —
  pass a surface class via `className` (e.g. your ClassMap's surface
  helper) or content will scroll visibly through the header.
- There is no breadcrumb prop; put a breadcrumb in the `leading` slot or
  render one above the header (see
  `@molecule/app-detail-page-layout-react`, which has a breadcrumb slot).
- Styling resolves through `getClassMap()` — requires a wired ClassMap
  bond (standard molecule app setup). No text of its own, so no locale
  bond is needed; translate the values you pass in.
