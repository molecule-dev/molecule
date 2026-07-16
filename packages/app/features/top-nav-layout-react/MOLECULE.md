# @molecule/app-top-nav-layout-react

Top-navigation app shell layout for routed React apps.

Exports `<TopNavLayout>` — sticky header with brand link + horizontal
NavLinks + a user-menu slot, plus `<main>` rendering React Router's
`<Outlet />` — and the `TopNavItem` / `TopNavLayoutProps` types.

## Quick Start

```tsx
import { TopNavLayout, type TopNavItem } from '@molecule/app-top-nav-layout-react'

const NAV: TopNavItem[] = [
  { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { key: 'reports', to: '/reports', icon: 'bar_chart', label: 'Reports' },
]

const userMenu = <button type="button">Account</button>

<TopNavLayout appName="Acme" navItems={NAV} userMenu={userMenu} />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-top-nav-layout-react @molecule/app-react @molecule/app-ui react react-router-dom
npm install -D @types/react
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

#### `TopNavLayout(props)`

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

- `props` — Component props (see {@link TopNavLayoutProps}).

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

Requires React Router: render it as a LAYOUT ROUTE element
(`<Route element={<TopNavLayout ... />}>` with child routes) — the page
body comes from the router `<Outlet />`, never from children. Nav labels
are hidden below the `md` breakpoint (icon-only mobile nav), so always
provide `icon` names; they render as Material Symbols ligatures and need
the Material Symbols font loaded by the host app. Styling mixes ClassMap
calls with raw Tailwind + Material-3 tokens (`bg-surface`,
`bg-primary-container`, `hidden md:inline`), so a Tailwind build that
source-scans this package's dist and a theme defining those tokens are
prerequisites — under a non-Tailwind ClassMap bond the header renders
unstyled. `label` is rendered as-is: pass an already-translated string.
