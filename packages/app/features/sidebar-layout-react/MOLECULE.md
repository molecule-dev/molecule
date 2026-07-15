# @molecule/app-sidebar-layout-react

Vertical sidebar app shell layout.

Exports `<SidebarLayout>` — fixed-width left sidebar with brand link +
vertical NavLinks + user-menu slot, scrollable main area on the right
rendering React Router's `<Outlet />`. ClassMap-styled.

## Quick Start

```tsx
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { UserMenu } from './UserMenu.js'

const NAV = [
  { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { key: 'projects', to: '/projects', icon: 'folder', label: 'Projects' },
  { key: 'settings', to: '/settings', icon: 'settings', label: 'Settings' },
]

export function AppShell() {
  return (
    <SidebarLayout
      appName="Acme App"
      navItems={NAV}
      userMenu={<UserMenu />}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-sidebar-layout-react @molecule/app-react @molecule/app-ui react react-router-dom
npm install -D @types/react
```

## API

### Interfaces

#### `SidebarLayoutProps`

Props accepted by the {@link SidebarLayout} component.

```typescript
interface SidebarLayoutProps {
  /** Brand text shown at the top of the sidebar (typically the app name). */
  appName: string
  /** Path the brand link navigates to. Defaults to `'/'`. */
  logoTo?: string
  /** Vertical nav items rendered in the sidebar. */
  navItems: ReadonlyArray<SidebarNavItem>
  /** Slot rendered at the bottom of the sidebar (typically a `<UserMenu />`). */
  userMenu?: ReactNode
  /** Optional slot rendered next to the user menu (typically a `<ThemeToggle />`). */
  themeToggle?: ReactNode
  /** Aria-label for the primary <nav>. */
  navAriaLabel?: string
  /** Tailwind width utility for the sidebar (e.g. `'w-60'`, `'w-64'`). Defaults to `'w-60'`. */
  sidebarWidthClass?: string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

#### `SidebarNavItem`

Describes a single item in the sidebar's vertical navigation list.

```typescript
interface SidebarNavItem {
  /** Route path the link goes to. */
  to: string
  /** Stable key — used for React keys and i18n key suffix. */
  key: string
  /** Material symbol icon name. */
  icon?: string
  /** Visible label. Apps that route this through `t(...)` should pass the resolved string. */
  label: string
}
```

### Functions

#### `SidebarLayout(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Vertical sidebar shell with brand + vertical nav + bottom user-menu slot.

```typescript
function SidebarLayout({
  appName,
  logoTo = '/',
  navItems,
  userMenu,
  themeToggle,
  navAriaLabel = 'Primary navigation',
  sidebarWidthClass = 'w-60',
  className,
  dataMolId,
}: SidebarLayoutProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `root0` — *
- `root0` — .appName
- `root0` — .logoTo
- `root0` — .navItems
- `root0` — .userMenu
- `root0` — .navAriaLabel
- `root0` — .sidebarWidthClass
- `root0` — .className
- `root0` — .dataMolId

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `react`
- `react-router-dom`
