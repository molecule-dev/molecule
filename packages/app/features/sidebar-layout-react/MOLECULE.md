# @molecule/app-sidebar-layout-react

Vertical sidebar app shell layout.

Exports `<SidebarLayout>` plus the `SidebarLayoutProps` and
`SidebarNavItem` types — fixed-width left sidebar with brand link,
vertical nav links, and bottom user-menu / theme-toggle slots; the main
area on the right scrolls and renders React Router's `<Outlet />` for
nested routes.

## Quick Start

```tsx
import { SidebarLayout } from '@molecule/app-sidebar-layout-react'
import type { SidebarNavItem } from '@molecule/app-sidebar-layout-react'

const NAV: SidebarNavItem[] = [
  { key: 'dashboard', to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { key: 'projects', to: '/projects', icon: 'folder', label: 'Projects' },
  { key: 'settings', to: '/settings', icon: 'settings', label: 'Settings' },
]

function AppShell() {
  return <SidebarLayout appName="Acme App" navItems={NAV} />
}
```

Mount it as a LAYOUT ROUTE so child routes render in the main area:
a parent route with `element={<AppShell />}` and your pages as child
routes.

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

#### `SidebarLayout(props)`

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

- `props` — Component props.

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

- Router required: calls `useLocation()` and renders `<Outlet />` — it
  throws outside a react-router `<Router>`, and the main area stays empty
  unless it is a layout route with child routes.
- Styling caveat: beyond ClassMap tokens this component hardcodes
  Tailwind + Material-3 utility classes (`w-60`, `bg-surface`,
  `border-outline-variant`, `bg-primary-container`, hover variants, …).
  The host app's Tailwind build must scan this package's dist (an
  `@source` line) or the shell renders unstyled; non-Tailwind ClassMap
  bonds cannot restyle these parts. `sidebarWidthClass` is likewise a raw
  Tailwind width utility.
- `icon` values are Material Symbols ligature names rendered with the
  `material-symbols-outlined` class — without the Material Symbols font
  loaded, the raw icon NAME shows as text. Omit `icon` when the font is
  not shipped.
- Active-nav highlighting picks the longest prefix-match of the current
  path; same-path clicks get a `#top` fragment appended (same behavior as
  `@molecule/app-safe-link-react`).
- `navAriaLabel` defaults to English "Primary navigation" — pass a
  translated string in localized apps (nav `label`s are plain strings;
  translate them upstream).
- Requires a bonded ClassMap. Sibling: `@molecule/app-shell-layout-react`
  is the top header/footer shell (router-free).
