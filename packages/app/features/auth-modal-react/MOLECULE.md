# @molecule/app-auth-modal-react

`@molecule/app-auth-modal-react` — the shared in-app login / signup /
upgrade flow. Mount {@link AuthModalMount} ONCE inside the app's
providers (where the `@molecule/app-react` auth hooks work) and every
in-app `/login` / `/signup` link opens the {@link AuthModal} instead of
navigating, while `/pricing` / `/billing` links open the upgrade flow in
a new tab (session auto-refreshes when the user returns) — no
navigation, no reload, no lost work. OAuth runs in a popup
(`loginViaPopup`), so social login never navigates the host either.

## Quick Start

```tsx
import { AuthModalMount } from '@molecule/app-auth-modal-react'
import { oauthConfig } from './config.js'

// Once, inside the app's providers (e.g. in App.tsx):
<AuthModalMount
  oauthConfig={oauthConfig}
  onAuthenticated={() => claimGuestWork()}
/>
// Every plain <a href="/login">, <a href="/signup">, <a href="/pricing">
// anywhere in the app is now intercepted — no other wiring needed.
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-auth-modal-react @molecule/app-auth-shell-react @molecule/app-i18n @molecule/app-oauth-buttons-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `AuthModalMountProps`

Props for {@link AuthModalMount}.

```typescript
interface AuthModalMountProps {
  /** OAuth config from the app's `config.ts` (drives the popup OAuth buttons). */
  oauthConfig: AuthModalProps['oauthConfig']
  /** Run before any login attempt (e.g. stash the guest id). Optional. */
  onBeforeAuth?: () => void
  /** Run after a successful login (session already refreshed). Optional. */
  onAuthenticated?: () => void | Promise<void>
  /**
   * Run when the user returns to this tab after the upgrade tab (the session is
   * already refreshed here) — e.g. invalidate usage so a budget banner clears.
   * Only fires for the default new-tab flow; irrelevant when
   * {@link AuthModalMountProps.onUpgradeIntercept} is set. Optional.
   */
  onUpgradeReturn?: () => void
  /**
   * Take over upgrade/billing CTA clicks instead of opening a new tab: called
   * with the matched upgrade path (e.g. `/pricing`), navigation already
   * prevented. The host renders its own upgrade UI (typically a modal) and owns
   * refreshing the session when that flow completes. Optional — when omitted,
   * the default new-tab flow (+ focus-return refresh) applies.
   */
  onUpgradeIntercept?: (path: string) => void
  /** Override the auth path→mode map (defaults to `/login`,`/signup`). */
  authPaths?: Readonly<Record<string, AuthModalMode>>
  /** Override the upgrade paths opened in a new tab (defaults to `/pricing`,`/billing`). */
  upgradePaths?: readonly string[]
}
```

#### `AuthModalProps`

Props for {@link AuthModal}.

```typescript
interface AuthModalProps {
  /** Whether the modal is open. */
  open: boolean
  /** Close without authenticating (backdrop / Escape / ✕). */
  onClose: () => void
  /** Which form to open on. Defaults to `'signup'`. */
  initialMode?: AuthModalMode
  /**
   * OAuth config consumed by `useOAuth()` — `{ baseURL, oauthProviders, oauthEndpoint }`
   * from the app's `config.ts`. Drives the popup OAuth buttons.
   */
  oauthConfig: Parameters<typeof useOAuth>[0]
  /**
   * Run synchronously BEFORE any login/signup/OAuth attempt — e.g. stash the guest
   * id so the new session can claim its work. Optional.
   */
  onBeforeAuth?: () => void
  /**
   * Run AFTER a successful login/signup/OAuth (the session is already refreshed),
   * still on the same page — e.g. claim guest projects, invalidate usage. Optional.
   */
  onAuthenticated?: () => void | Promise<void>
}
```

### Types

#### `AuthModalMode`

Which form {@link AuthModal} should show.

```typescript
type AuthModalMode = 'login' | 'signup'
```

### Functions

#### `AuthModal(props)`

The in-app auth modal: login/signup tabs rendered in a Modal overlay — the user authenticates without leaving the current page (no navigation, no lost work). Usually rendered via `AuthModalMount`, not directly.

```typescript
function AuthModal({
  open,
  onClose,
  initialMode = 'signup',
  oauthConfig,
  onBeforeAuth,
  onAuthenticated,
}: AuthModalProps): JSX.Element
```

- `props` — {@link AuthModalProps}.

**Returns:** The modal element (renders nothing when closed).

#### `AuthModalMount(props)`

Mounts the in-app auth modal + the CTA click-interceptor: renders the (initially hidden) AuthModal and installs a capture-phase document click handler that opens it for in-app `/login`/`/signup` links (and routes `/pricing`/`/billing` clicks to the upgrade flow). Mount ONCE inside the app providers.

```typescript
function AuthModalMount({
  oauthConfig,
  onBeforeAuth,
  onAuthenticated,
  onUpgradeReturn,
  onUpgradeIntercept,
  authPaths = DEFAULT_AUTH_PATHS,
  upgradePaths = DEFAULT_UPGRADE_PATHS,
}: AuthModalMountProps): JSX.Element
```

- `props` — {@link AuthModalMountProps}.

**Returns:** The (lazily-mounted) auth modal element.

#### `authModeForHref(href, origin, authPaths)`

Map a CTA link's href to the auth mode it should open, or `null` if it is not
an auth link (so the interceptor leaves it alone).

```typescript
function authModeForHref(href: string | null | undefined, origin: string, authPaths?: Readonly<Record<string, AuthModalMode>>): AuthModalMode | null
```

- `href` — The clicked anchor's href (relative or absolute).
- `origin` — The page origin to resolve a relative href against.
- `authPaths` — Path→mode map (defaults to {@link DEFAULT_AUTH_PATHS}).

**Returns:** `'login'` / `'signup'`, else `null`.

#### `upgradePathForHref(href, origin, upgradePaths)`

Whether a CTA link's href points at the upgrade/billing flow (which the
interceptor hands to the host's `onUpgradeIntercept`, else opens in a new tab).

```typescript
function upgradePathForHref(href: string | null | undefined, origin: string, upgradePaths?: readonly string[]): string | null
```

- `href` — The clicked anchor's href (relative or absolute).
- `origin` — The page origin to resolve a relative href against.
- `upgradePaths` — The upgrade paths (defaults to {@link DEFAULT_UPGRADE_PATHS}).

**Returns:** The matched pathname, else `null`.

### Constants

#### `DEFAULT_AUTH_PATHS`

The default in-app auth routes that open the modal.

```typescript
const DEFAULT_AUTH_PATHS: Readonly<Record<string, AuthModalMode>>
```

#### `DEFAULT_UPGRADE_PATHS`

The default routes that open the upgrade/billing flow (modal or new tab).

```typescript
const DEFAULT_UPGRADE_PATHS: readonly string[]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-auth-shell-react` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-oauth-buttons-react` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-auth-shell-react`
- `@molecule/app-i18n`
- `@molecule/app-oauth-buttons-react`
- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

Interception is capture-phase on `document` and matches plain
left-clicks on `<a href>` whose resolved pathname is in `authPaths`
(default `/login`, `/signup`) or `upgradePaths` (default `/pricing`,
`/billing`) — modifier/middle clicks still navigate normally, and
non-anchor buttons that call `navigate()` are NOT intercepted. Hosts
that render pricing in-place pass `onUpgradeIntercept` and own that UI
+ the post-upgrade session refresh. `AuthModalMount` must render inside
the app's auth/HTTP providers (it calls `useAuth`), and the standalone
`/login` & `/signup` pages should stay routed — they are the fallback
for modifier clicks and deep links. App-specific extras (stash a guest
id, claim guest work, invalidate usage) go in `onBeforeAuth` /
`onAuthenticated`. The modal's `auth.modal.*` strings are homed in the
`@molecule/app-locales-common` bond (79 languages), alongside the
`auth.login.*` / `auth.signup.*` keys the modal also renders.
