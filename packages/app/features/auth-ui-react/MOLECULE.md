# @molecule/app-auth-ui-react

React auth-kit components for molecule.dev.

Reusable pieces of the auth flow (OAuth button row, etc.) designed
for apps to compose into their own branded Login/Signup pages.
Structural pieces only — branded layouts, copy, and wrapping chrome
stay at the app level.

## Quick Start

```tsx
import { OAuthButtons } from '@molecule/app-auth-ui-react'
import { oauthConfig } from './config.js'

<OAuthButtons
  oauthConfig={oauthConfig}
  iconSize={28}
  showLabels={true}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-auth-ui-react
```

## API

### Functions

#### `OAuthButtons(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Config-driven OAuth provider button row rendered beneath a
login/signup form.

This is the convenience layer over the primitives in
`@molecule/app-oauth-buttons-react`: it reads `providers` + `redirect`
from `useOAuth(oauthConfig)`, then composes `<OAuthDivider>` (the "or
continue with" rule) above `<OAuthButtons>` (the button row). Apps
with an `oauthConfig` object use this; apps that already hold a raw
provider list use the lower-level `<OAuthButtons>` directly.

The component also owns the CALLBACK half of the page-based flow:
`useOAuth` detects `?code&state` on the page this row is mounted on,
exchanges the code, and reports the outcome here — a failed exchange
(forged/expired code, state mismatch, provider rejection) renders a
VISIBLE inline error (`data-mol-id="oauth-error"`, `role="alert"`)
instead of failing silently, and a success fires `onSuccess` so the
host can navigate into the app.

```typescript
function OAuthButtons({
  oauthConfig,
  className,
  iconSize = 30,
  iconMode = 'brand',
  showLabels = false,
  dividerKey = 'oauth.orContinueWith',
  dividerDefault = 'or continue with',
  onSuccess,
  onError,
}: OAuthButtonsProps): JSX.Element | null
```

- `root0` — See `OAuthButtonsProps`.
- `root0` — .oauthConfig - Config object passed to `useOAuth()`.
- `root0` — .className - Extra class on the outer wrapper.
- `root0` — .iconSize - Logo size in pixels (default 30).
- `root0` — .iconMode - Logo color mode (`'brand'` | `'mono'`).
- `root0` — .showLabels - Render provider label text next to the logo.
- `root0` — .dividerKey - i18n key for the divider label.
- `root0` — .dividerDefault - Fallback divider text.
- `root0` — .onSuccess - Called after a successful OAuth login.
- `root0` — .onError - Called (after the inline error renders) when the exchange fails.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-oauth-buttons-react` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
