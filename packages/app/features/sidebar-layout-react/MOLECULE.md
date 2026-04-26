# @molecule/app-sidebar-layout-react

Vertical sidebar app shell with brand link + vertical NavLinks + user-menu slot, plus React Router `<Outlet />` for nested routes.

The companion to `@molecule/app-top-nav-layout-react` — pick this when the app is data-heavy or B2B (CI/CD dashboards, admin tools, banking, project management). Pick top-nav for consumer apps with horizontal nav.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-sidebar-layout-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0

### Exports

```ts
export interface SidebarNavItem {
  to: string
  key: string
  icon?: string
  label: string
}

export interface SidebarLayoutProps {
  appName: string
  logoTo?: string
  navItems: ReadonlyArray<SidebarNavItem>
  userMenu?: ReactNode
  navAriaLabel?: string
  sidebarWidthClass?: string  // 'w-60' default
  className?: string
  dataMolId?: string
}

export function SidebarLayout(props: SidebarLayoutProps): JSX.Element
```

### Usage

```tsx
import { useTranslation } from '@molecule/app-react'
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

export function MyAppLayout() {
  const { t } = useTranslation()
  return (
    <SidebarLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={[
        { to: '/dashboard', key: 'dashboard', icon: 'dashboard', label: t('nav.dashboard', {}, { defaultValue: 'Dashboard' }) },
        { to: '/accounts',  key: 'accounts',  icon: 'wallet',    label: t('nav.accounts',  {}, { defaultValue: 'Accounts' }) },
      ]}
      userMenu={<UserMenu />}
    />
  )
}
```
