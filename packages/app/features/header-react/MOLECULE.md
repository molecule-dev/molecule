# @molecule/app-header-react

Top app-shell header: branded logo + appName on the left, slotted actions (theme toggle, user menu, extras) on the right

## Type
`feature`

## Installation
```bash
npm install @molecule/app-header-react
```

## API

### Interfaces

#### `AppHeaderProps`

Props for the {@link AppHeader} component.

```typescript
interface AppHeaderProps {
  /** Brand display name shown next to the logo. */
  appName: string
  /** Logo image source. Defaults to `/logo.svg` (the convention scaffolded by mlcl). */
  logoSrc?: string
  /** Logo size in pixels (square). Defaults to 30 to match the flagship-app convention. */
  logoSize?: number
  /** Path the brand link navigates to. Defaults to `/`. */
  brandTo?: string
  /** Slot for the right-side user menu — typically `<UserMenu />` from `@molecule/app-ui-react`. */
  userMenu?: ReactNode
  /**
   * Theme toggle slot. Defaults to `<ThemeToggle />` from `@molecule/app-ui-react`.
   * Pass `null` to hide it, or your own component (e.g. an icon-bonded variant) to override.
   */
  themeToggle?: ReactNode
  /** Optional extra actions rendered between the theme toggle and the user menu. */
  extraActions?: ReactNode
  /**
   * Apply `cm.headerFixed` for sticky/fixed positioning. Defaults to `true`,
   * matching the flagship-app convention. Set to `false` for a non-sticky header.
   */
  fixed?: boolean
  /** Extra className on the outer `<header>` (composed with `cm.headerBar` + optional `cm.headerFixed`). */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

### Functions

#### `AppHeader({
  appName,
  logoSrc = '/logo.svg',
  logoSize = 30,
  brandTo = '/',
  userMenu,
  themeToggle = DEFAULT_THEME_TOGGLE,
  extraActions,
  fixed = true,
  className,
  dataMolId,
})`

Renders the {@link AppHeader} component.

```typescript
function AppHeader({
  appName,
  logoSrc = '/logo.svg',
  logoSize = 30,
  brandTo = '/',
  userMenu,
  themeToggle = DEFAULT_THEME_TOGGLE,
  extraActions,
  fixed = true,
  className,
  dataMolId,
}: AppHeaderProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
