# @molecule/app-shell-layout-react

React top-level app shell layout.

Exports `<AppShellLayout>` — header + main content + footer, with the page
frame styled via the ClassMap bond. Apps fill the slots with their own
Header, Footer, and route content (typically `<Outlet />`).

## Quick Start

```tsx
import { AppShellLayout } from '@molecule/app-shell-layout-react'
import { Outlet } from 'react-router-dom'

import { AppFooter } from './AppFooter.js'
import { AppHeader } from './AppHeader.js'

export function Shell() {
  return (
    <AppShellLayout
      header={<AppHeader />}
      footer={<AppFooter />}
      maxWidth="xl"
    >
      <Outlet />
    </AppShellLayout>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-shell-layout-react
```

## API

### Functions

#### `AppShellLayout(root0, root0, root0, root0, root0, root0, root0, root0)`

Top-level page scaffold: header → main (constrained by Container) → footer.

The page frame uses ClassMap tokens (`cm.page`, `cm.appLayout`) so the
styling library can be swapped without touching consumers. The header and
footer are slot props so consumers retain full control over branding,
navigation, and footer copy.

```typescript
function AppShellLayout({
  header,
  footer,
  children,
  maxWidth = 'xl',
  className,
  mainClassName,
  dataMolId,
}: AppShellLayoutProps): JSX.Element
```

- `root0` — *
- `root0` — .header
- `root0` — .footer
- `root0` — .children
- `root0` — .maxWidth
- `root0` — .className
- `root0` — .mainClassName
- `root0` — .dataMolId

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
