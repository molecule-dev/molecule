# @molecule/app-plan-updated-page-react

`<PlanUpdated />` — post-purchase confirmation page.

Renders a thank-you headline + Return Home button after the user
completes a plan upgrade. Reads auth state to show a spinner while
the session is still hydrating, so the page is safe to navigate to
directly from a webhook redirect or fresh page load.

Replaces the byte-identical `pages/PlanUpdated.tsx` shipped by 76 of
the 115 flagship apps that have a paid-plan flow. All translation
keys come from `@molecule/app-locales-common` — no per-app locale
additions needed.

## Quick Start

```tsx
import { PlanUpdated } from '@molecule/app-plan-updated-page-react'

// In your router:
<Route path="/plan-updated" element={<PlanUpdated />} />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-plan-updated-page-react
```

## API

### Functions

#### `PlanUpdated(root0, root0, root0, root0, root0, root0, root0, root0)`

Post-purchase confirmation page rendered after a plan upgrade.

Reads auth state via `useAuth`; while it's still initializing, shows
a centered spinner. Once ready, renders a celebratory layout:
a large success glyph in a soft circular halo, a two-line thank-you
(`planUpdated.message`, `planUpdated.thankYou`), and a Return Home
button styled with the app's primary color tokens.

All three translation keys are part of the universal common-locale
bond (`@molecule/app-locales-common`), so adopting apps don't need
to declare them locally. Visual layout uses only ClassMap tokens so
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

- `root0` — Optional copy/navigation overrides (all default to the
- `root0` — .messageKey - i18n key for the confirmation message.
- `root0` — .messageDefault - Default confirmation message.
- `root0` — .thankYouKey - i18n key for the thank-you line.
- `root0` — .thankYouDefault - Default thank-you line.
- `root0` — .actionKey - i18n key for the return-home action label.
- `root0` — .actionDefault - Default action label.
- `root0` — .actionHref - Href the return-home action navigates to.

**Returns:** The plan-updated confirmation page element.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
