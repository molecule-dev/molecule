# @molecule/app-auth-modal-react

`@molecule/app-auth-modal-react` — the shared in-app login / signup / upgrade
flow. Mount {@link AuthModalMount} once and every in-app auth/upgrade CTA stays
in place: no navigation, no reload, no lost work.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-auth-modal-react
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
   * Optional.
   */
  onUpgradeReturn?: () => void
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

The in-app auth modal. See the module doc for the no-navigation contract.

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

Mounts the in-app auth modal + the CTA click-interceptor. See the module doc.

```typescript
function AuthModalMount({
  oauthConfig,
  onBeforeAuth,
  onAuthenticated,
  onUpgradeReturn,
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
interceptor opens in a new tab).

```typescript
function upgradePathForHref(href: string | null | undefined, origin: string, upgradePaths?: readonly string[]): string | null
```

- `href` — The clicked anchor's href (relative or absolute).
- `origin` — The page origin to resolve a relative href against.
- `upgradePaths` — The upgrade paths (defaults to {@link DEFAULT_UPGRADE_PATHS}).

**Returns:** The matched pathname (to open in a new tab), else `null`.

### Constants

#### `DEFAULT_AUTH_PATHS`

The default in-app auth routes that open the modal.

```typescript
const DEFAULT_AUTH_PATHS: Readonly<Record<string, AuthModalMode>>
```

#### `DEFAULT_UPGRADE_PATHS`

The default routes that open the upgrade/billing flow in a new tab.

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
