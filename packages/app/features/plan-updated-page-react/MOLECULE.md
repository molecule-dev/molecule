# @molecule/app-plan-updated-page-react

`<PlanUpdated />` — post-purchase confirmation page.

Renders a thank-you headline + Return Home button after the user
completes a plan upgrade. Reads auth state to show a spinner while
the session is still hydrating, so the page is safe to navigate to
directly from a webhook redirect or fresh page load.

Replaces the byte-identical `pages/PlanUpdated.tsx` shipped by 76 of
the 115 flagship apps that have a paid-plan flow. Translation keys
come from `@molecule/app-locales-common` plus one key from the
companion bond `@molecule/app-locales-plan-updated-page` (see
remarks).

## Quick Start

```tsx
import { Route } from 'react-router-dom'
import { PlanUpdated } from '@molecule/app-plan-updated-page-react'

<Route path="/plan-updated" element={<PlanUpdated />} />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-plan-updated-page-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react react-router-dom
npm install -D @types/react
```

## API

### Interfaces

#### `PlanUpdatedProps`

Props for {@link PlanUpdated}. All optional — defaults reproduce the original
hardcoded copy, so existing `<PlanUpdated />` usages are unchanged.

```typescript
interface PlanUpdatedProps {
  /** i18n key for the confirmation message. */
  messageKey?: string
  /** Default confirmation message when the key is missing. */
  messageDefault?: string
  /** i18n key for the thank-you line. */
  thankYouKey?: string
  /** Default thank-you line when the key is missing. */
  thankYouDefault?: string
  /** i18n key for the return-home action label. */
  actionKey?: string
  /** Default action label when the key is missing. */
  actionDefault?: string
  /** Href the return-home action navigates to. Defaults to `/`. */
  actionHref?: string
}
```

### Functions

#### `PlanUpdated(props)`

Post-purchase confirmation page rendered after a plan upgrade.

Reads auth state via `useAuth`; while it's still initializing, shows
a centered spinner. Once ready, renders a celebratory layout:
a large success glyph in a soft circular halo, a two-line thank-you
(`planUpdated.message`, `planUpdated.thankYou`), and a Return Home
button styled with the app's primary color tokens.

Those three translation keys are part of the universal common-locale
bond (`@molecule/app-locales-common`); the always-rendered "View
receipt" link uses `planUpdated.viewReceipt` from the companion bond
`@molecule/app-locales-plan-updated-page` and navigates to the
hardcoded `/billing` route. Visual layout uses only ClassMap tokens so
it inherits the app's theme (radius, color tokens, spacing) with no
per-app override.

```typescript
function PlanUpdated({
  messageKey = 'planUpdated.message',
  messageDefault = 'Your plan has been updated.',
  thankYouKey = 'planUpdated.thankYou',
  thankYouDefault = 'Thank you!',
  actionKey = 'planUpdated.returnHome',
  actionDefault = 'Return home',
  actionHref = '/',
}?: PlanUpdatedProps): JSX.Element
```

- `props` — Component props (see {@link PlanUpdatedProps}).

**Returns:** The plan-updated confirmation page element.

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

Requires react-router-dom (renders `<Link>`, so it must sit inside your
Router) and the `@molecule/app-react` auth provider (`useAuth` drives the
hydration spinner). Keys `planUpdated.message` / `planUpdated.thankYou` /
`planUpdated.returnHome` come from `@molecule/app-locales-common`; the
"View receipt" link uses `planUpdated.viewReceipt` from the companion bond
`@molecule/app-locales-plan-updated-page` and always navigates to
`/billing` — ensure that route exists. For the pricing-page-integrated
variant see `PlanUpdatedPage` in `@molecule/app-pricing-page-react` (a
same-named `PlanUpdatedPage` is also exported by
`@molecule/app-legal-pages-react`) — import the one whose kit you are using.

## Translations

Translation strings are provided by `@molecule/app-locales-plan-updated-page`.
