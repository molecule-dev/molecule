# @molecule/app-nav-chrome-react

React nav-chrome shells.

Exports:
- `<AppShellTopNav>` — top bar with logo / items / right actions.
- `<AppShellSideNav>` — vertical sidebar with items or groups, header/footer slots.
- `<AppShellBottomNav>` — mobile bottom tab bar.
- `<AppShellFooter>` — bottom page footer with logo / copyright / links / right slot.
- `NavItem`, `NavGroup`, `FooterLink` types.

Every shell is pure slots — apps decide what renders in each position.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-nav-chrome-react
```

## API

### Interfaces

#### `NavGroup`

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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
