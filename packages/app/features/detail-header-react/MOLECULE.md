# @molecule/app-detail-header-react

React detail-page header.

Exports `<DetailHeader>` — title + subtitle + status + actions + optional
meta row + optional search slot. Different from `<PageHeader>` in
prioritising status + stickiness for long-scrolling detail screens.

## Quick Start

```tsx
import { DetailHeader } from '@molecule/app-detail-header-react'

<DetailHeader
  title="Project Alpha"
  subtitle="Last updated 2 hours ago"
  status={<StatusBadge label="Active" color="success" />}
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

### Functions

#### `DetailHeader(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .title
- `root0` — .subtitle
- `root0` — .leading
- `root0` — .status
- `root0` — .actions
- `root0` — .meta
- `root0` — .search
- `root0` — .sticky
- `root0` — .className
- `root0` — .dataMolId

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
