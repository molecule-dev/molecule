# @molecule/app-header-react

Top app-shell header — branded logo + appName on the left, slotted actions
(theme toggle, extra actions, user menu) on the right.

Reproduces the byte-identical Header pattern from 9 flagship apps as a
single composable primitive. Pair with `@molecule/app-shell-layout-react`'s
`<AppShellLayout>` to assemble a full chrome.

## Quick Start

```tsx
import { AppHeader } from '@molecule/app-header-react'
import { UserMenu } from '@molecule/app-ui-react'

function Shell() {
  // UserMenu takes the settings panel as CHILDREN (no renderPanel prop);
  // panel content dismisses the drawer via usePanelClose().
  return (
    <AppHeader
      appName="Bearing"
      userMenu={
        <UserMenu>
          <div>Your settings panel here</div>
        </UserMenu>
      }
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-header-react @molecule/app-ui @molecule/app-ui-react react react-router-dom
npm install -D @types/react
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

Sticky top app-shell header — logo + appName on the left, slotted actions
on the right. All visual styling routes through ClassMap tokens
(`cm.headerBar`, `cm.headerFixed`, `cm.logoText`) so the bonded styling
layer controls the visual treatment.

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

### Runtime Dependencies

- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`
- `react-router-dom`

- Must render inside a `react-router-dom` router — the brand link is a
  `<Link>` and throws outside a Router context.
- The DEFAULT `themeToggle` slot is `<ThemeToggle />`, which calls
  `useTheme()` and `useTranslation()` — BOTH throw without
  `@molecule/app-react`'s `ThemeProvider` + `I18nProvider`. In a host
  without those providers pass `themeToggle={null}`.
- `fixed` defaults to `true` (`cm.headerFixed` positions the header fixed):
  give the page content a matching top offset (flagships get it from
  `<AppShellLayout>`), or pass `fixed={false}` for an in-flow header.
- `logoSrc` defaults to `/logo.svg`, the file mlcl scaffolds into `public/`.
- Styling routes through ClassMap tokens (`cm.headerBar`, `cm.headerFixed`,
  `cm.headerInner`, `cm.logoText`) — requires a bonded ClassMap.
