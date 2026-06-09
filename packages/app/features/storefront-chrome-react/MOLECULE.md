# @molecule/app-storefront-chrome-react

`@molecule/app-storefront-chrome-react` — wrapping chrome for an
e-commerce app: announcement bar, top nav (cart + profile dropdown),
column-based footer.

Stateless about auth and cart shape. Consumers wire up the live cart
count + auth state and pass them as props; the components stay
compositional and reusable across storefronts with different
backends.

Extracted from the online-store flagship.

## Quick Start

```tsx
import {
  StorefrontAnnouncementBar,
  StorefrontTopNav,
  StorefrontFooter,
} from '@molecule/app-storefront-chrome-react'

<>
  <StorefrontAnnouncementBar
    message="Free shipping on orders over $75"
    cta={{ to: '/', label: 'Shop now' }}
  />
  <StorefrontTopNav
    brand="Bazaar"
    links={[{ to: '/', label: 'Shop', active: true }, { to: '/search?q=all', label: 'Categories' }]}
    actions={[
      { to: '/search', icon: 'search', ariaLabel: 'Search' },
      { to: '/cart', icon: 'shopping_cart', ariaLabel: 'Cart', badgeCount: cartCount },
    ]}
    isAuthenticated={isAuthenticated}
    profileImageUrl={user?.avatarUrl}
    authedMenu={[{ to: '/settings', label: 'My Account' }, { to: '/orders', label: 'Orders' }]}
    unauthedMenu={[{ to: '/login', label: 'Sign in' }, { to: '/signup', label: 'Create account' }]}
    onSignOut={handleSignOut}
  />
</>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-storefront-chrome-react
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
  profileImageAlt = 'User profile',
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
  profileImageAlt = 'User profile',
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
