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
  /**
   * Sidebar width — a stack-agnostic preset (`'sm'` | `'md'` | `'lg'`) or an
   * exact pixel `number`. Applied via inline style so no Tailwind width utility
   * couples consumers to the styling library. Defaults to `'md'` (240px).
   */
  sidebarWidth?: SidebarWidth
  /**
   * Legacy sidebar-width prop retained only for backward compatibility.
   *
   * @deprecated Use {@link SidebarLayoutProps.sidebarWidth} instead. A raw
   * Tailwind width utility (`'w-60'`, `'w-64'`) coupled consumers to Tailwind.
   * Still accepted for backward compatibility: a `w-<n>` value is PARSED to a
   * pixel width and applied via inline style (never re-emitted as a class), so
   * old callers keep working without reintroducing the coupling. `sidebarWidth`
   * takes precedence when both are supplied.
   */
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

### Types

#### `SidebarWidth`

Semantic sidebar width. Mapped to a fixed pixel width internally and applied
via inline style (a width is one of the "specific values" a styling-agnostic
ClassMap cannot express as a swappable token) so the sidebar renders the same
regardless of which ClassMap bond is active — no Tailwind width utility leaks
into consumer code.

- `sm` → 208px, `md` → 240px (default), `lg` → 256px.
- Pass a raw `number` for an exact pixel width.

```typescript
type SidebarWidth = 'sm' | 'md' | 'lg' | number
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
  sidebarWidth,
  sidebarWidthClass,
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
- Fully ClassMap-driven: every layout/surface/border/text/state class is
  resolved through `getClassMap()` (`cm.pageShell`, `cm.page`, `cm.surface`,
  `cm.borderR`, `cm.bgPrimarySubtle`/`cm.textPrimary` for the active item,
  `cm.textMuted`/`cm.link` for the rest, …), so swapping the ClassMap bond
  restyles the whole shell — no raw Tailwind/Material-3 utility class is
  baked in. The sidebar WIDTH is the one "specific value" a styling-agnostic
  ClassMap can't express, so it is applied via inline style: use the
  stack-agnostic `sidebarWidth` prop (`'sm'`|`'md'`|`'lg'`|pixel `number`),
  NOT a Tailwind width utility. The old `sidebarWidthClass` prop is
  `@deprecated` — still accepted, but its `w-<n>` value is parsed to pixels
  (never re-emitted as a class).
- `icon` values are Material Symbols ligature names rendered with the
  `material-symbols-outlined` font class — the one documented icon-font
  exception (a font ligature the consumer supplies as data, not a hardcoded
  chrome glyph). Without the Material Symbols font loaded, the raw icon NAME
  shows as text — omit `icon` when the font is not shipped.
- Active-nav highlighting picks the longest prefix-match of the current
  path; same-path clicks get a `#top` fragment appended (same behavior as
  `@molecule/app-safe-link-react`).
- `navAriaLabel` defaults to English "Primary navigation" — pass a
  translated string in localized apps (nav `label`s are plain strings;
  translate them upstream).
- Requires a bonded ClassMap. Sibling: `@molecule/app-shell-layout-react`
  is the top header/footer shell (router-free).
