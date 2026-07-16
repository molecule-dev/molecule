# @molecule/app-detail-page-layout-react

React detail-page layout scaffold.

Exports `<DetailPageLayout>` — breadcrumb + top bar + [main column +
optional sidebar]. All regions are ReactNode slots.

## Quick Start

```tsx
import { DetailPageLayout } from '@molecule/app-detail-page-layout-react'
import { Breadcrumb } from '@molecule/app-breadcrumb-react'
import { DetailHeader } from '@molecule/app-detail-header-react'

<DetailPageLayout
  breadcrumb={<Breadcrumb items={crumbs} />}
  topBar={<DetailHeader title={recipe.title} actions={editButton} sticky />}
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

### Interfaces

#### `DetailPageLayoutProps`

```typescript
interface DetailPageLayoutProps {
  /** Breadcrumb rendered above everything. */
  breadcrumb?: ReactNode
  /** Sticky top bar — title, status, actions. */
  topBar?: ReactNode
  /** Main content column (usually stacked cards / sections). */
  main: ReactNode
  /** Optional sidebar column (related items, metadata cards). */
  sidebar?: ReactNode
  /** Sidebar position — `'right'` default or `'left'`. */
  sidebarPosition?: 'left' | 'right'
  /** Sidebar width preset. Defaults to `'md'`. */
  sidebarWidth?: 'sm' | 'md' | 'lg'
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

### Functions

#### `DetailPageLayout(props)`

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

- `props` — Component props (see {@link DetailPageLayoutProps}).

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

- The layout itself does NOT make `topBar` sticky — it just stacks the
  regions. Use a slot component that brings its own stickiness (e.g.
  `<DetailHeader sticky>`), or wrap your top bar in a sticky container.
- `sidebarWidth` presets are fixed flex-basis widths: sm = 256px,
  md = 320px, lg = 384px. There is no built-in responsive collapse —
  hide the sidebar yourself on narrow viewports if needed.
- `RecipeSections` and `RelatedRecipes` above are your own app
  components — any ReactNode works in the slots.
- Styling resolves through `getClassMap()` — requires a wired ClassMap
  bond (standard molecule app setup).
