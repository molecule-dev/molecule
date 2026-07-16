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
npm install @molecule/app-shell-layout-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `AppShellLayoutProps`

Props accepted by the {@link AppShellLayout} component.

```typescript
interface AppShellLayoutProps {
  /** Slot for the header (typically the app's `<Header />`). */
  header?: ReactNode
  /** Slot for the footer (typically the app's `<Footer />`). */
  footer?: ReactNode
  /** Main content. Pass `<Outlet />` from `react-router-dom` for routed apps. */
  children: ReactNode
  /** Container max-width for the main content. Defaults to `'xl'`. */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string
  /** Extra classes on the outer wrapper. */
  className?: string
  /**
   * Extra classes on the inner `<main>` element. Apps that need
   * vertical rhythm around the routed content (e.g. `cm.sp('py', 8)`)
   * pass it here instead of forking the shell. Omitted by default so
   * the `<main>` carries no padding.
   */
  mainClassName?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

### Functions

#### `AppShellLayout(props)`

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

- `props` — Component props (see {@link AppShellLayoutProps}).

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

- Requires a bonded ClassMap (frame uses `cm.page` + `cm.appLayout`) —
  rendering throws otherwise. No i18n or router dependency; `<Outlet />`
  is just the typical child — any content works.
- The `<main>` carries no padding by default — pass `mainClassName`
  (e.g. `cm.sp('py', 8)`) for vertical rhythm around routed content.
- Header/footer slots render as-is with no positioning — make your header
  sticky yourself if desired.
- Sibling: `@molecule/app-sidebar-layout-react` is the left-sidebar shell
  (router-coupled); THIS package is the top header/footer shell.
