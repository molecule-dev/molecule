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

```typescript
interface FooterColumn {
  heading: ReactNode
  links: { to: string; label: ReactNode }[]
}
```

#### `NavActionSpec`

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

```typescript
interface ProfileMenuItem {
  to: string
  label: ReactNode
  dataMolId?: string
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
