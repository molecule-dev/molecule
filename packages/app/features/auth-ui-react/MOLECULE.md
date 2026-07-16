# @molecule/app-auth-ui-react

React auth-kit components for molecule.dev.

Exports `<OAuthButtons>` — the config-driven OAuth row for branded
Login/Signup pages: reads `providers` from `useOAuth(oauthConfig)`,
renders the "or continue with" divider + provider buttons, and owns
the CALLBACK half of the page-based flow (`?code&state` exchange on
the page it is mounted on, with a visible inline error on failure).

NOT the same component as `OAuthButtons` from
`@molecule/app-oauth-buttons-react` — that lower-level primitive takes
an explicit `providers` list and renders only the row; this one wraps
it and takes the app's `oauthConfig` from `config.ts`. Structural
pieces only — branded layout, copy, and chrome stay at the app level.

## Quick Start

```tsx
import { OAuthButtons } from '@molecule/app-auth-ui-react'
import { oauthConfig } from './config.js'

// On the Login/Signup page (the OAuth redirect must land back here):
<OAuthButtons
  oauthConfig={oauthConfig}
  showLabels
  onSuccess={() => navigate('/dashboard')}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-auth-ui-react @molecule/app-oauth-buttons-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `OAuthButtonsProps`

```typescript
interface OAuthButtonsProps {
  /**
   * OAuth config object consumed by `useOAuth()`. Typed as `any` here
   * because the concrete shape lives in the app's `config.ts`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oauthConfig: any
  /** Extra class applied to the outer wrapper. */
  className?: string
  /** Icon size in pixels. Defaults to 30. */
  iconSize?: number
  /** Logo color mode — `'brand'` (default, official multi-color) or `'mono'`. */
  iconMode?: 'brand' | 'mono'
  /** When true, render the provider label text next to the logo. */
  showLabels?: boolean
  /** Override the default "or continue with" divider text. */
  dividerKey?: string
  dividerDefault?: string
  /**
   * Called after a successful OAuth login (the session is already
   * established) — e.g. `() => navigate('/dashboard')`.
   */
  onSuccess?: () => void
  /**
   * Called when the OAuth callback exchange fails. The (already visible)
   * inline error message is passed through for hosts that also want to
   * surface it elsewhere.
   */
  onError?: (error: string) => void
}
```

### Functions

#### `OAuthButtons(props)`

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

- `props` — Component props (see {@link OAuthButtonsProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-oauth-buttons-react` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-oauth-buttons-react`
- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

Renders `null` when `oauthConfig` yields no providers — safe to include
unconditionally. Mount it on the page the OAuth provider redirects back
to, or the code exchange never runs. A failed exchange renders an
inline `role="alert"` error (`data-mol-id="oauth-error"`) and also
calls `onError`. Divider copy defaults to "or continue with"
(override via `dividerKey` / `dividerDefault`); translations come from
the companion `@molecule/app-locales-oauth-buttons` locale bond.
