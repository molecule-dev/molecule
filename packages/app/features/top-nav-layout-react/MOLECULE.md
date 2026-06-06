# @molecule/app-top-nav-layout-react

Top-navigation app shell layout for routed React apps.

Exports `<TopNavLayout>` — sticky header with brand link + horizontal
NavLinks + a user-menu slot, plus `<main>` rendering React Router's
`<Outlet />`. ClassMap-styled.

## Quick Start

```tsx
import { TopNavLayout } from '@molecule/app-top-nav-layout-react'

const NAV = [
  { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { key: 'reports',   to: '/reports',   icon: 'bar_chart', label: 'Reports' },
]

<TopNavLayout appName="Acme" navItems={NAV} userMenu={<UserMenu />} />
```

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
