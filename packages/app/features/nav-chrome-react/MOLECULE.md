# @molecule/app-nav-chrome-react

React nav-chrome shells.

Exports:
- `<AppShellTopNav>` — top bar with logo / items / right actions.
- `<AppShellSideNav>` — vertical sidebar with items or groups, header/footer slots.
- `<AppShellBottomNav>` — mobile bottom tab bar.
- `<AppShellFooter>` — bottom page footer with logo / copyright / links / right slot.
- `NavItem`, `NavGroup`, `FooterLink` types.

Every shell is pure slots — apps decide what renders in each position.

## Quick Start

```tsx
import { AppShellTopNav, AppShellSideNav } from '@molecule/app-nav-chrome-react'

const navItems = [
  { id: 'home', label: 'Home', to: '/' },
  { id: 'settings', label: 'Settings', to: '/settings' },
]

<AppShellTopNav
  logo={<img src="/logo.svg" alt="App" />}
  items={navItems}
  activeId="home"
  onItemClick={(item) => router.push(item.to!)}
  right={<UserMenu />}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-nav-chrome-react
```

## API

### Interfaces

#### `FooterLink`

A single navigable link rendered in the footer link row.

```typescript
interface FooterLink {
  label: ReactNode
  to?: string
}
```

#### `NavGroup`

A labeled group of NavItems rendered as a collapsible section in side/bottom nav shells.

```typescript
interface NavGroup {
  /** Group id. */
  id: string
  /** Optional heading above the group. */
  heading?: ReactNode
  /** Items in this group. */
  items: NavItem[]
}
```

#### `NavItem`

Nav item shape shared by top/side/bottom nav shells.

```typescript
interface NavItem {
  /** Unique id (React key + active-state matcher). */
  id: string
  /** Display label. */
  label: ReactNode
  /** Optional leading icon. */
  icon?: ReactNode
  /** Route target — when provided, the item renders as a link. */
  to?: string
  /** Optional badge / count to the right of the label. */
  badge?: ReactNode
  /** When true, the item is rendered in a disabled visual state. */
  disabled?: boolean
}
```

### Functions

#### `AppShellBottomNav(root0, root0, root0, root0, root0)`

Mobile/tablet bottom tab bar — typically 3–5 primary nav destinations.
Each item shows icon + short label. On desktop layouts this is usually
hidden via parent-level responsive chrome.

```typescript
function AppShellBottomNav({
  items,
  activeId,
  onItemClick,
  className,
}: AppShellBottomNavProps): JSX.Element
```

- `root0` — *
- `root0` — .items
- `root0` — .activeId
- `root0` — .onItemClick
- `root0` — .className

#### `AppShellFooter(root0, root0, root0, root0, root0, root0)`

Bottom page footer shell. All content is optional — apps mix and match
logo / copyright / links / right-slot as the design demands.

```typescript
function AppShellFooter({
  logo,
  copyright,
  links,
  right,
  className,
}: AppShellFooterProps): JSX.Element
```

- `root0` — *
- `root0` — .logo
- `root0` — .copyright
- `root0` — .links
- `root0` — .right
- `root0` — .className

#### `AppShellSideNav(root0, root0, root0, root0, root0, root0, root0, root0)`

Vertical side nav shell. Pass either `items` for a flat list or
`groups` for a sectioned layout ("Main / Teams / Settings"). Header
and footer slots remain fixed while the middle scrolls.

```typescript
function AppShellSideNav({
  items,
  groups,
  activeId,
  onItemClick,
  header,
  footer,
  className,
}: AppShellSideNavProps): JSX.Element
```

- `root0` — *
- `root0` — .items
- `root0` — .groups
- `root0` — .activeId
- `root0` — .onItemClick
- `root0` — .header
- `root0` — .footer
- `root0` — .className

#### `AppShellTopNav(root0, root0, root0, root0, root0, root0, root0)`

Top navigation shell — logo on the left, nav items in the centre,
app-level actions on the right. Fully slot-driven; apps decide what
to render in each position.

```typescript
function AppShellTopNav({
  logo,
  items,
  activeId,
  onItemClick,
  right,
  className,
}: AppShellTopNavProps): JSX.Element
```

- `root0` — *
- `root0` — .logo
- `root0` — .items
- `root0` — .activeId
- `root0` — .onItemClick
- `root0` — .right
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
