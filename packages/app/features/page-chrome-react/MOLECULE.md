# @molecule/app-page-chrome-react

React page-header and hero-section primitives.

Exports:
- `<PageHeader>` — top-of-page header with breadcrumbs + title/subtitle + actions + meta.
- `<HeroSection>` — dashboard/landing hero with text + optional media column.

Both accept `className` for per-brand accent styling.

## Quick Start

```tsx
import { PageHeader, HeroSection } from '@molecule/app-page-chrome-react'

<PageHeader
  title="Projects"
  subtitle="Manage your active projects"
  actions={<Button onClick={() => setOpen(true)}>New project</Button>}
/>

<HeroSection
  eyebrow="Welcome back"
  title="Your workspace"
  description="Everything you need to ship faster."
  primaryAction={<Button variant="solid">Get started</Button>}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-page-chrome-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `HeroSection(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Dashboard / landing hero. Text column on the left, optional media on
the right. Alignment defaults to `start` for dashboards; use
`align="center"` for marketing-style landing heroes.

```typescript
function HeroSection({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  media,
  align = 'start',
  className,
  dataMolId,
}: HeroSectionProps): JSX.Element
```

- `root0` — *
- `root0` — .eyebrow
- `root0` — .title
- `root0` — .description
- `root0` — .primaryAction
- `root0` — .secondaryAction
- `root0` — .media
- `root0` — .align
- `root0` — .className
- `root0` — .dataMolId

#### `PageHeader(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Standard page-top header with optional breadcrumbs, leading icon,
title / subtitle pair, meta row, and right-aligned actions.

Layout: breadcrumbs, then a two-column row with title+subtitle on the
left and actions on the right, then optional meta.

```typescript
function PageHeader({
  title,
  subtitle,
  icon,
  breadcrumbs,
  actions,
  meta,
  emphasis = 'normal',
  dataMolId,
  className,
}: PageHeaderProps): JSX.Element
```

- `root0` — *
- `root0` — .title
- `root0` — .subtitle
- `root0` — .icon
- `root0` — .breadcrumbs
- `root0` — .actions
- `root0` — .meta
- `root0` — .dataMolId
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
