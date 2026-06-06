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
npm install @molecule/app-page-chrome-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
