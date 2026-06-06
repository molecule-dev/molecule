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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
