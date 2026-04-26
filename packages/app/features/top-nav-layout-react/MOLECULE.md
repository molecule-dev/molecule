# @molecule/app-top-nav-layout-react

Sticky top-nav app shell with brand link + horizontal NavLinks + user-menu slot, plus React Router `<Outlet />` for nested routes.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-top-nav-layout-react
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
export interface TopNavItem {
  to: string
  key: string
  icon?: string  // material symbol name
  label: string
}

export interface TopNavLayoutProps {
  appName: string
  logoTo?: string
  navItems: ReadonlyArray<TopNavItem>
  userMenu?: ReactNode
  navAriaLabel?: string
  className?: string
  dataMolId?: string
}

export function TopNavLayout(props: TopNavLayoutProps): JSX.Element
```

### Usage

```tsx
import { useTranslation } from '@molecule/app-react'
import { TopNavLayout } from '@molecule/app-top-nav-layout-react'

import { APP_NAME } from '../branding.js'
import { UserMenu } from './UserMenu.js'

export function MyAppLayout() {
  const { t } = useTranslation()
  return (
    <TopNavLayout
      appName={APP_NAME}
      logoTo="/dashboard"
      navItems={[
        { to: '/products', key: 'products', icon: 'storefront', label: t('nav.products', {}, { defaultValue: 'Products' }) },
        { to: '/orders',   key: 'orders',   icon: 'receipt_long', label: t('nav.orders',   {}, { defaultValue: 'Orders' }) },
      ]}
      userMenu={<UserMenu />}
    />
  )
}
```

The wrapper component lives in each app's `app/src/components/` so apps can keep their own `<UserMenu />` injection and any per-app i18n / branding logic.
