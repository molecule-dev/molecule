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
import { AppShellTopNav, type NavItem } from '@molecule/app-nav-chrome-react'

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', to: '/' },
  { id: 'settings', label: 'Settings', to: '/settings' },
]

declare function navigate(to: string): void

<AppShellTopNav
  logo={<img src="/logo.svg" alt="App" />}
  items={navItems}
  activeId="home"
  onItemClick={(item) => { if (item.to) navigate(item.to) }}
  right={<span>account menu slot</span>}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-nav-chrome-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `AppShellBottomNavProps`

```typescript
interface AppShellBottomNavProps {
  items: NavItem[]
  activeId?: string
  onItemClick?: (item: NavItem) => void
  /** Extra classes. */
  className?: string
}
```

#### `AppShellFooterProps`

```typescript
interface AppShellFooterProps {
  /** Optional brand / logo. */
  logo?: ReactNode
  /** Optional copyright text. */
  copyright?: ReactNode
  /** Footer links — rendered in a row. */
  links?: FooterLink[]
  /** Optional right-side slot (locale picker, social icons). */
  right?: ReactNode
  /** Extra classes. */
  className?: string
}
```

#### `AppShellSideNavProps`

```typescript
interface AppShellSideNavProps {
  /** Nav content: either a flat list of items or grouped sections. */
  items?: NavItem[]
  groups?: NavGroup[]
  /** Active item id. */
  activeId?: string
  /** Called when a nav item is clicked. */
  onItemClick?: (item: NavItem) => void
  /** Optional header slot (logo, workspace switcher). */
  header?: ReactNode
  /** Optional footer slot (theme toggle, sign-out). */
  footer?: ReactNode
  /** Extra classes. */
  className?: string
}
```

#### `AppShellTopNavProps`

```typescript
interface AppShellTopNavProps {
  /** Left-side brand / logo slot. */
  logo?: ReactNode
  /** Centre nav items (usually the primary app sections). */
  items?: NavItem[]
  /** Which item is currently active (by `id`). */
  activeId?: string
  /** Called when an item is clicked (hand off to your router). */
  onItemClick?: (item: NavItem) => void
  /** Right-side slot — user menu, notifications, theme toggle, etc. */
  right?: ReactNode
  /** Extra classes. */
  className?: string
}
```

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
  /**
   * Route target. The shells do NOT render links — every item renders a
   * button and navigation is delegated to `onItemClick` (call your
   * router there, e.g. `navigate(item.to)`). `to` is carried through
   * untouched for exactly that purpose.
   */
  to?: string
  /** Optional badge / count to the right of the label. */
  badge?: ReactNode
  /** When true, the item is rendered in a disabled visual state. */
  disabled?: boolean
}
```

### Functions

#### `AppShellBottomNav(props)`

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

- `props` — Component props (see {@link AppShellBottomNavProps}).

#### `AppShellFooter(props)`

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

- `props` — Component props (see {@link AppShellFooterProps}).

#### `AppShellSideNav(props)`

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

- `props` — Component props (see {@link AppShellSideNavProps}).

#### `AppShellTopNav(props)`

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

- `props` — Component props (see {@link AppShellTopNavProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

Requires a wired ClassMap bond — `getClassMap()` throws before wiring.

Router-agnostic BY DESIGN: nav items render as `<button>` elements,
never links — `NavItem.to` is only carried through so YOUR
`onItemClick` can hand it to whatever router the app uses. Without an
`onItemClick` handler, clicking a nav item does nothing. Only
`AppShellFooter` links render real `<a href>` elements.

The shells ship no surface/background/positioning of their own —
sticky headers, sidebar widths, borders, and elevation are the
caller's `className` / layout concern.
