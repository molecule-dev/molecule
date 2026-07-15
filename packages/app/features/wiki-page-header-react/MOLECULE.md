# @molecule/app-wiki-page-header-react

Wiki / docs page header.

Exports `<WikiPageHeader>`.

## Quick Start

```tsx
import { WikiPageHeader } from '@molecule/app-wiki-page-header-react'

<WikiPageHeader
  title="Getting Started"
  breadcrumb={<span>Docs / Guides</span>}
  version="v3"
  updatedAt="2 days ago"
  updatedBy="Alice"
  tags={<><span>guide</span><span>setup</span></>}
  onEdit={() => navigate('/edit')}
  onHistory={() => navigate('/history')}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-wiki-page-header-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `WikiPageHeader(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Wiki / docs / knowledge-base page header — breadcrumb +
title + meta row (version, updated time/by, tags) + Edit/History
action buttons.

```typescript
function WikiPageHeader({
  title,
  breadcrumb,
  version,
  updatedAt,
  updatedBy,
  tags,
  onEdit,
  onHistory,
  extraActions,
  className,
}: WikiPageHeaderProps): JSX.Element
```

- `root0` — *
- `root0` — .title
- `root0` — .breadcrumb
- `root0` — .version
- `root0` — .updatedAt
- `root0` — .updatedBy
- `root0` — .tags
- `root0` — .onEdit
- `root0` — .onHistory
- `root0` — .extraActions
- `root0` — .className

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
