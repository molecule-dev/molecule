# @molecule/app-detail-page-layout-react

React detail-page layout scaffold.

Exports `<DetailPageLayout>` — breadcrumb + top bar + [main column + optional sidebar].

## Quick Start

```tsx
import { DetailPageLayout } from '@molecule/app-detail-page-layout-react'

<DetailPageLayout
  breadcrumb={<Breadcrumb items={crumbs} />}
  topBar={<PageTitle title={recipe.title} actions={<EditButton />} />}
  main={<RecipeSections recipe={recipe} />}
  sidebar={<RelatedRecipes ids={recipe.relatedIds} />}
  sidebarPosition="right"
  sidebarWidth="md"
  dataMolId="recipe-detail"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-detail-page-layout-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `DetailPageLayout(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Two- or three-row detail-page scaffold.

Layout: breadcrumb (optional), top bar (optional sticky), two-column
body with a main region and an optional sidebar on either side.
Apps fill the slots with their own cards/sections.

```typescript
function DetailPageLayout({
  breadcrumb,
  topBar,
  main,
  sidebar,
  sidebarPosition = 'right',
  sidebarWidth = 'md',
  className,
  dataMolId,
}: DetailPageLayoutProps): JSX.Element
```

- `root0` — *
- `root0` — .breadcrumb
- `root0` — .topBar
- `root0` — .main
- `root0` — .sidebar
- `root0` — .sidebarPosition
- `root0` — .sidebarWidth
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
