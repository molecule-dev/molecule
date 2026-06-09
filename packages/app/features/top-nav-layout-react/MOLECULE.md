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

## API

### Interfaces

#### `TopNavItem`

A single navigation item rendered in the top nav bar.

```typescript
interface TopNavItem {
  /** Route path the link goes to. */
  to: string
  /** Stable key — used for React keys and i18n key suffix. */
  key: string
  /** Material symbol icon name (or any glyph) shown next to the label. */
  icon?: string
  /** Visible label. Apps that route this through `t(...)` should pass the resolved string. */
  label: string
}
```

#### `TopNavLayoutProps`

Props for the {@link TopNavLayout} shell component.

```typescript
interface TopNavLayoutProps {
  /** Brand text shown in the top-left link (typically the app name). */
  appName: string
  /** Path the brand link navigates to. Defaults to `'/'`. */
  logoTo?: string
  /** Horizontal nav items rendered in the header. */
  navItems: ReadonlyArray<TopNavItem>
  /** Slot rendered at the right of the header (typically a `<UserMenu />`). */
  userMenu?: ReactNode
  /** Aria-label for the primary <nav>. */
  navAriaLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

### Functions

#### `TopNavLayout(root0, root0, root0, root0, root0, root0, root0, root0)`

Sticky top-nav shell with brand + horizontal nav + user-menu slot.

```typescript
function TopNavLayout({
  appName,
  logoTo = '/',
  navItems,
  userMenu,
  navAriaLabel = 'Primary navigation',
  className,
  dataMolId,
}: TopNavLayoutProps): JSX.Element
```

- `root0` — *
- `root0` — .appName
- `root0` — .logoTo
- `root0` — .navItems
- `root0` — .userMenu
- `root0` — .navAriaLabel
- `root0` — .className
- `root0` — .dataMolId

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
