# @molecule/app-storefront-chrome-react

`@molecule/app-storefront-chrome-react` — wrapping chrome for an
e-commerce app: announcement bar, top nav (cart + profile dropdown),
column-based footer. Extracted verbatim from the online-store
flagship, including its visual identity (white/slate surfaces, green
hover accents).

Stateless about auth and cart shape. Consumers wire up the live cart
count + auth state and pass them as props; the components stay
compositional and reusable across storefronts with different
backends.

## Quick Start

```tsx
import {
  StorefrontAnnouncementBar,
  StorefrontFooter,
  StorefrontTopNav,
} from '@molecule/app-storefront-chrome-react'

function StorefrontShell({ cartCount, isAuthenticated, avatarUrl, onSignOut }: {
  cartCount: number
  isAuthenticated: boolean
  avatarUrl?: string
  onSignOut: () => void
}) {
  return (
    <>
      <StorefrontAnnouncementBar
        message="Free shipping on orders over $75"
        cta={{ to: '/', label: 'Shop now' }}
      />
      <StorefrontTopNav
        brand="Bazaar"
        links={[{ to: '/', label: 'Shop', active: true }]}
        actions={[
          { to: '/search', icon: 'search', ariaLabel: 'Search' },
          { to: '/cart', icon: 'shopping_cart', ariaLabel: 'Cart', badgeCount: cartCount },
        ]}
        isAuthenticated={isAuthenticated}
        profileImageUrl={avatarUrl}
        authedMenu={[{ to: '/settings', label: 'My Account' }, { to: '/orders', label: 'Orders' }]}
        unauthedMenu={[{ to: '/login', label: 'Sign in' }, { to: '/signup', label: 'Create account' }]}
        onSignOut={onSignOut}
      />
    </>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-storefront-chrome-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react react-router-dom
npm install -D @types/react
```

## API

### Interfaces

#### `FooterColumn`

Describes a single column of links rendered in the storefront footer.

```typescript
interface FooterColumn {
  heading: ReactNode
  links: { to: string; label: ReactNode }[]
}
```

#### `NavActionSpec`

Describes an icon-button action (e.g. cart, search) shown in the storefront header.

```typescript
interface NavActionSpec {
  to: string
  /** Material-symbols icon name. */
  icon: string
  ariaLabel: string
  /** Optional numeric badge (e.g. cart count). Hidden when <= 0. */
  badgeCount?: number
  dataMolId?: string
}
```

#### `NavLinkSpec`

Describes a navigation link rendered in the storefront header nav bar.

```typescript
interface NavLinkSpec {
  to: string
  label: ReactNode
  /** Visually highlights the link as the current page. */
  active?: boolean
  dataMolId?: string
}
```

#### `ProfileMenuItem`

Describes a single item in the storefront header profile dropdown menu.

```typescript
interface ProfileMenuItem {
  to: string
  label: ReactNode
  dataMolId?: string
}
```

#### `StorefrontAnnouncementBarProps`

Props for the {@link StorefrontAnnouncementBar} component.

```typescript
interface StorefrontAnnouncementBarProps {
  message: ReactNode
  cta?: { to: string; label: ReactNode }
  className?: string
}
```

#### `StorefrontFooterProps`

Props for the {@link StorefrontFooter} component.

```typescript
interface StorefrontFooterProps {
  brand: ReactNode
  tagline?: ReactNode
  columns?: FooterColumn[]
  copyright: ReactNode
  className?: string
}
```

#### `StorefrontTopNavProps`

Props for the {@link StorefrontTopNav} component.

```typescript
interface StorefrontTopNavProps {
  brand: ReactNode
  brandTo?: string
  links?: NavLinkSpec[]
  actions?: NavActionSpec[]
  isAuthenticated: boolean
  /**
   * Avatar image URL. OPTIONAL enhancement only — the account/sign-in
   * menu always renders so it is reachable without one. When absent the
   * trigger falls back to `profileInitials`, else a default avatar icon.
   */
  profileImageUrl?: string
  /**
   * Uppercase initials shown in the avatar when no `profileImageUrl` is
   * given (e.g. "JD"). Falls back to a default avatar icon when omitted.
   */
  profileInitials?: string
  /** Avatar alt text. Defaults to English "User profile" — pass a translated string. */
  profileImageAlt?: string
  /** Accessible name for the account-menu trigger. Defaults to English "Account menu". */
  accountMenuLabel?: string
  authedMenu?: ProfileMenuItem[]
  unauthedMenu?: ProfileMenuItem[]
  onSignOut?: () => void
  /** Sign-out button label. Defaults to English "Sign Out" — pass a translated string. */
  signOutLabel?: ReactNode
  className?: string
}
```

### Functions

#### `StorefrontAnnouncementBar({
  message,
  cta,
  className,
})`

Storefront announcement / promo bar.

```typescript
function StorefrontAnnouncementBar({
  message,
  cta,
  className,
}: StorefrontAnnouncementBarProps): JSX.Element
```

#### `StorefrontFooter({
  brand,
  tagline,
  columns = [],
  copyright,
  className,
})`

Storefront footer with brand block + columns + copyright.

```typescript
function StorefrontFooter({
  brand,
  tagline,
  columns = [],
  copyright,
  className,
}: StorefrontFooterProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

#### `StorefrontTopNav({
  brand,
  brandTo = '/',
  links = [],
  actions = [],
  isAuthenticated,
  profileImageUrl,
  profileInitials,
  profileImageAlt = 'User profile',
  accountMenuLabel = 'Account menu',
  authedMenu = [],
  unauthedMenu = [],
  onSignOut,
  signOutLabel = 'Sign Out',
  className,
})`

Storefront top navigation bar.

```typescript
function StorefrontTopNav({
  brand,
  brandTo = '/',
  links = [],
  actions = [],
  isAuthenticated,
  profileImageUrl,
  profileInitials,
  profileImageAlt = 'User profile',
  accountMenuLabel = 'Account menu',
  authedMenu = [],
  unauthedMenu = [],
  onSignOut,
  signOutLabel = 'Sign Out',
  className,
}: StorefrontTopNavProps): JSX.Element
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`
- `react-router-dom`

- Hard requirement: `react-router-dom` (peer dep) — every link is a
  router `<Link>`, so the components MUST render inside a `<Router>`
  or they throw. In npm-workspace/symlinked setups keep
  `react-router-dom` in Vite `resolve.dedupe`.
- `NavActionSpec.icon` is a Material Symbols LIGATURE name
  (`'shopping_cart'`): load the "Material Symbols Outlined" font in
  the host app or the nav shows raw words instead of icons.
- The account/sign-in menu (`authedMenu` when signed in, else
  `unauthedMenu`) ALWAYS renders and is reachable regardless of
  `profileImageUrl`. The avatar image is an optional enhancement: with
  no URL the trigger shows `profileInitials`, else a default avatar
  icon — reachability is never gated on the image.
- `signOutLabel`, `profileImageAlt` and `accountMenuLabel` default to
  English strings; pass translated values (no companion locale bond
  ships).
- Styling is the flagship palette hardcoded with raw utilities
  (`bg-white dark:bg-slate-900`, slate-900 footer, GREEN link-hover
  accents, `max-w-[1280px]`), not ClassMap tokens: it will not follow
  your brand automatically, and apps outside the flagship safelists
  must ensure their Tailwind build scans these literals.
