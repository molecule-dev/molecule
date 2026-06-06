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
npm install @molecule/app-detail-page-layout-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
