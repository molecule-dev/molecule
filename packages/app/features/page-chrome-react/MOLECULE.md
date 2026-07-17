# @molecule/app-page-chrome-react

React page-header and hero-section primitives.

Exports:
- `<PageHeader>` — top-of-page header with breadcrumbs + title/subtitle +
  leading icon + right-aligned actions + meta row. `emphasis="extrabold"`
  switches the title to the larger dashboard treatment.
- `<HeroSection>` — dashboard/landing hero with text + optional media
  column; `align="center"` for marketing-style heroes.

Both accept `className` for per-brand accent styling and `dataMolId` for
AI-agent selectors.

## Quick Start

```tsx
import { useState } from 'react'
import { PageHeader, HeroSection } from '@molecule/app-page-chrome-react'
import { Button } from '@molecule/app-ui-react'

function ProjectsPage() {
  const [open, setOpen] = useState(false)
  return (
    <>
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
    </>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-page-chrome-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `HeroSectionProps`

Props for {@link HeroSection}.

```typescript
interface HeroSectionProps {
  /** Small eyebrow line above the headline. */
  eyebrow?: ReactNode
  /** Primary headline. */
  title: ReactNode
  /** Supporting description. */
  description?: ReactNode
  /** Primary call-to-action. */
  primaryAction?: ReactNode
  /** Optional secondary call-to-action. */
  secondaryAction?: ReactNode
  /** Optional visual / illustration slot, positioned to the right at md+. */
  media?: ReactNode
  /** Horizontal alignment — defaults to `start`. */
  align?: 'start' | 'center'
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

#### `PageHeaderProps`

Props for {@link PageHeader}.

```typescript
interface PageHeaderProps {
  /** Primary heading (usually `t('...')`). */
  title: ReactNode
  /** Optional subheading rendered below the title. */
  subtitle?: ReactNode
  /** Optional leading icon next to the title. */
  icon?: ReactNode
  /** Optional breadcrumb trail rendered above the title row. */
  breadcrumbs?: ReactNode
  /** Right-aligned actions (buttons, menus, etc.). */
  actions?: ReactNode
  /** Optional meta row rendered below the title/subtitle (status chips, timestamps, etc.). */
  meta?: ReactNode
  /**
   * Title emphasis level. Both values resolve their weight through
   * `cm.fontWeight(...)`, so the class is a real, theme-scanned utility.
   * - `'normal'` (default) — 3xl `cm.fontWeight('bold')`, for general /
   *   reusable list-page headers.
   * - `'extrabold'` — the larger 4xl `cm.fontWeight('extrabold')` dashboard
   *   treatment (`font-extrabold` is safelisted by `@molecule/app-ui-tailwind`'s
   *   base.css, so it always generates).
   */
  emphasis?: 'normal' | 'extrabold'
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes on the outer wrapper. */
  className?: string
}
```

### Functions

#### `HeroSection(props)`

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

- `props` — Component props (see {@link HeroSectionProps}).

#### `PageHeader(props)`

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

- `props` — Component props (see {@link PageHeaderProps}).

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

Not to be confused with `@molecule/app-ui-react`'s own `<PageHeader>`
(props: `title`/`description`/`actions`/`breadcrumbs`): THIS PageHeader
takes `subtitle` (not `description`) and adds `icon`, `meta`, and
`emphasis`. Import from the package that matches the props you pass.
Styling resolves via `getClassMap()` from `@molecule/app-ui`, so a ClassMap
bond (e.g. `@molecule/app-ui-tailwind`) must be wired before render.
