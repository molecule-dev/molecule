# @molecule/app-shell-layout-react

Top-level app shell layout for routed React apps.

Exports `<AppShellLayout>` — header slot + main content (constrained by `Container`) + footer slot. The page frame is styled via the ClassMap bond, so swapping the styling library is a bond change rather than a sweep across every consumer.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-shell-layout-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Exports

```ts
export interface AppShellLayoutProps {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | string
  className?: string
  dataMolId?: string
}

export function AppShellLayout(props: AppShellLayoutProps): JSX.Element
```

### Usage

```tsx
import { Outlet } from 'react-router-dom'

import { AppShellLayout } from '@molecule/app-shell-layout-react'

import { Footer } from './Footer.js'
import { Header } from './Header.js'

export function AppLayout() {
  return (
    <AppShellLayout header={<Header />} footer={<Footer />}>
      <Outlet />
    </AppShellLayout>
  )
}
```

The wrapper component above lives in each app's `app/src/components/AppLayout.tsx` so apps can keep their own per-app `<Header />` and `<Footer />` injections, or override the layout entirely without forking the package.
