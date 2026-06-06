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
npm install @molecule/app-wiki-page-header-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
