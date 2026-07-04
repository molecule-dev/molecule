# @molecule/app-settings-panel-react

`@molecule/app-settings-panel-react` — composable settings panel.

`<SettingsContainer>` owns the panel layout + `onClose` context;
each section component (`<AccountSection>`, `<AuthSection>`,
`<NotificationsSection>`, `<BillingSection>`, `<DevicesSection>`,
`<ThisDeviceSection>`, `<LogOutDeleteSection>`) is independent and
reads its own state from hooks. Apps compose via JSX children —
picking which sections to include, in what order, and interleaving
their own custom sections.

## Quick Start

```tsx
import {
  SettingsContainer,
  AccountSection,
  AuthSection,
  NotificationsSection,
  BillingSection,
  DevicesSection,
  ThisDeviceSection,
  LogOutDeleteSection,
} from '@molecule/app-settings-panel-react'

import { Footer } from './Footer.js'

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  return (
    <SettingsContainer onClose={onClose}>
      <AccountSection />
      <AuthSection />
      <NotificationsSection />
      <BillingSection />
      <DevicesSection />
      <ThisDeviceSection />
      <LogOutDeleteSection />
      <Footer />
    </SettingsContainer>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-settings-panel-react
```

## API

### Interfaces

#### `Device`

A user's registered device (subset rendered in the settings list).

```typescript
interface Device {
  id: string
  name: string
  platform: string
  lastSeen?: string
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}
```

#### `PushToggleDevice`

Device row slice returned by `GET /api/devices`.

```typescript
interface PushToggleDevice {
  id: string
  isCurrent?: boolean
  hasPushSubscription?: boolean
}
```

#### `PushToggleHttp`

Minimal structural slice of `@molecule/app-http`'s HttpClient used here.

```typescript
interface PushToggleHttp {
  get<T = unknown>(url: string): Promise<{ data: T }>
  patch<T = unknown>(url: string, data?: unknown): Promise<{ data: T }>
}
```

#### `PushToggleToken`

Push token slice returned by `@molecule/app-push` `register()`.

```typescript
interface PushToggleToken {
  value: string
  platform: 'web' | 'ios' | 'android'
}
```

#### `SettingsPanelContextValue`

Context published by `<SettingsContainer>` to its children.

The container owns the dismiss-the-panel handler; sub-components
that need to close after an action (logout, delete account, email
error) read it from context rather than threading the prop down.

```typescript
interface SettingsPanelContextValue {
  onClose: () => void
}
```

### Types

#### `PushToggleFailureReason`

Why an enable/disable attempt failed (mapped to i18n by the component).

```typescript
type PushToggleFailureReason =
  | 'permission-denied'
  | 'server-unconfigured'
  | 'register-failed'
  | 'persist-failed'
```

#### `PushToggleResult`

Result of an enable/disable attempt.

```typescript
type PushToggleResult =
  | { ok: true }
  | { ok: false; reason: PushToggleFailureReason; message?: string }
```

### Functions

#### `AccountSection()`

Account section — edits the user's display name + email. Fetches
`/users/me` on mount to refresh the current user record (and write it
back to the auth cache so subsequent reloads see the latest data). On
blur of either field, PATCHes `/api/users/:id` with the changed field;
reverts + shows an inline error if the request fails.

The user resource's update handler accepts `name`, `username`, and
`email`; this surfaces `name` + `email` (the universally-present
profile fields). Apps that use a public `username` handle can extend
this with a username field the same way.

```typescript
function AccountSection(): JSX.Element
```

#### `AppearanceSection()`

Appearance section — dark-mode toggle wired to the theme bond.

Apps that expose other appearance knobs (font size, density, etc.)
can either add more sub-components to this package or render their
own section in line with `<AppearanceSection>` via children.

```typescript
function AppearanceSection(): JSX.Element
```

#### `AuthSection()`

Authentication section — change password (modal) + two-factor (TOTP) setup.

Two-factor uses the real enrollment flow against the user resource's
`POST /users/:id/verify-two-factor` endpoint (`@molecule/api-two-factor`):
- Enable → `{action:'setup'}` returns a QR code + secret to scan into an
  authenticator app → user enters the 6-digit code → `{action:'enable', token}`.
- Disable → user enters a current code → `{action:'disable', token}`.
The current status is read from `/users/me`. (This replaces the previous
boolean toggle, which PATCHed `twoFactorEnabled` — a field the update
handler deliberately ignores — so it never actually enrolled 2FA.)

Auto-hides for OAuth-only users (`user.oauthServer` truthy) since
password / 2FA wouldn't apply. If the app's API has no two-factor
provider bonded, setup fails gracefully with an inline message.

```typescript
function AuthSection(): JSX.Element | null
```

#### `BillingSection({
  plan = 'Free',
  upgradeTo = '/settings',
}?)`

Billing section — current plan + Upgrade button.

Fetches `/api/billing/status` on mount and uses the returned plan
name as a more accurate label than the parent-supplied default.
The `plan` prop remains a fallback (e.g. for offline rendering or
apps that don't expose `/billing/status`).

The Upgrade button navigates to `upgradeTo` (default `/settings`).
Pass `upgradeTo="/billing"` or `upgradeTo="/pricing"` if your app
routes elsewhere. Apps with a multi-tier checkout flow should use
`<TiersUpgradeSection>` instead.

```typescript
function BillingSection({
  plan = 'Free',
  upgradeTo = '/settings',
}?: { plan?: string; upgradeTo?: string; }): JSX.Element
```

#### `DevicesSection({
  renderRowIcon,
}?)`

Devices section — lists the user's registered devices and lets them
revoke (sign out) any device other than the one they're currently using.

Revoking deletes the device row (`DELETE /api/devices/:id`). The API's
authorization layer enforces server-side revocation: it rejects that
device's session the next time it makes a request (within the
device-exists cache TTL), so the removed device is actually signed out —
not just hidden from the list. The current device is labelled
"This device" and is not revocable here (use Sign out for the current
session). Recreates molecule v1's device-revocation behaviour.

Apps that want a different trailing element per row can pass a
`renderRowIcon` callback (which then replaces the built-in revoke
control); pass `() => null` to suppress it entirely.

```typescript
function DevicesSection({
  renderRowIcon,
}?: { renderRowIcon?: (device: Device) => ReactNode; }): JSX.Element
```

#### `disablePushOnCurrentDevice(deps, deps, deps)`

Disables push: unsubscribes the browser (best-effort — a dev build without
a service worker has nothing to unsubscribe) and ALWAYS clears the server
state so no further pushes target this device.

```typescript
function disablePushOnCurrentDevice(deps: { http: PushToggleHttp; unregister: () => Promise<void>; }): Promise<PushToggleResult>
```

- `deps` — The http client + push action from `usePush()`.
- `deps` — .http - Authenticated http client (`useHttpClient()`).
- `deps` — .unregister - `usePush().unregister`.

**Returns:** `{ ok: true }` or a typed failure (server state not cleared).

#### `enablePushOnCurrentDevice(deps, deps, deps, deps)`

Runs the full enable chain: browser permission → runtime VAPID public key
(`GET /api/devices/push/public-key`) → `register({ vapidPublicKey })` →
persist the subscription on the current device row.

Every failure is returned as a typed reason (never thrown) so the UI can
show an honest, specific message instead of hanging or silently reverting.

```typescript
function enablePushOnCurrentDevice(deps: { http: PushToggleHttp; requestPermission: () => Promise<string>; register: (options?: { vapidPublicKey?: string; }) => Promise<PushToggleToken>; }): Promise<PushToggleResult>
```

- `deps` — The http client + push actions from `usePush()`.
- `deps` — .http - Authenticated http client (`useHttpClient()`).
- `deps` — .requestPermission - `usePush().requestPermission`.
- `deps` — .register - `usePush().register`.

**Returns:** `{ ok: true }` or a typed failure.

#### `findCurrentDevice(devices)`

Picks the caller's own device row: the api flags the session device
`isCurrent`; fall back to the first row for sessions predating the flag.

```typescript
function findCurrentDevice(devices: PushToggleDevice[] | undefined): PushToggleDevice | undefined
```

- `devices` — Rows from `GET /api/devices`.

**Returns:** The current device row, or `undefined` when the user has none.

#### `LogOutDeleteSection()`

Bottom actions section — Log out + Delete account.

Owns the delete-account modal internally (the trigger lives in the
same section so the modal lives here too). Reads `onClose` from
the `<SettingsContainer>` context to dismiss the panel after either
action and navigates to `/login`.

```typescript
function LogOutDeleteSection(): JSX.Element
```

#### `NotificationsSection()`

Push-notification toggle section — the full receive-side enable chain:
browser permission → runtime VAPID public key
(`GET /api/devices/push/public-key`) → `pushManager.subscribe` with
`applicationServerKey` → PATCH the subscription onto the current device
row (`/api/devices/:id { pushSubscription, hasPushSubscription }`), which
is where the api-side push fan-outs look for it.

Initial state reflects SERVER truth (the current device row's
`hasPushSubscription`), and every failure surfaces as an honest inline
message — a dev build without a service worker fails fast instead of
hanging the switch.

```typescript
function NotificationsSection(): JSX.Element
```

#### `readCurrentDevicePushEnabled(http)`

Reads whether push is currently enabled for THIS device (server truth:
the current device row's `hasPushSubscription`).

```typescript
function readCurrentDevicePushEnabled(http: PushToggleHttp): Promise<boolean>
```

- `http` — Authenticated http client (`useHttpClient()`).

**Returns:** `true` when the current device has a stored subscription.

#### `SettingsContainer({
  onClose,
  children,
})`

Outer settings-panel layout: padded vertical stack that hosts the
section sub-components. Publishes `onClose` to descendants via
context so `<LogOutDeleteSection>` etc. can dismiss the panel
after an action without explicit prop threading.

```typescript
function SettingsContainer({
  onClose,
  children,
}: { onClose: () => void; children: ReactNode; }): ReactElement<unknown, string | JSXElementConstructor<any>>
```

#### `subscriptionFromToken(token)`

Converts an `@molecule/app-push` token into the device resource's
`pushSubscription` shape (web PushSubscription JSON, FCM registration for
Android, APNs registration for iOS).

```typescript
function subscriptionFromToken(token: PushToggleToken): unknown
```

- `token` — The push token returned by `register()`.

**Returns:** The `pushSubscription` value to PATCH onto the device row.

#### `ThisDeviceSection()`

"This device" detail strip — OS, browser, online/offline.

Reads from `@molecule/app-device` (useDevice hook) + browser
`navigator.onLine`. No side effects, no app-specific state.

```typescript
function ThisDeviceSection(): JSX.Element
```

#### `TiersUpgradeSection()`

Billing section with full multi-tier upgrade flow.

Replaces the simpler `<BillingSection>` for apps backed by
`@molecule/api-payments-stripe` + `@molecule/api-resource-payment`
— loads the user's current plan from `/api/billing/status`,
loads available tiers from `/api/billing/tiers`, and renders an
Upgrade modal with a Subscribe button per tier price. Subscribe
POSTs to `/api/billing/checkout` and redirects to the Stripe
checkout URL; paid users see a Cancel button that POSTs to
`/api/billing/cancel`.

```typescript
function TiersUpgradeSection(): JSX.Element
```

#### `useSettingsPanelContext()`

Reads the `onClose` handler exposed by the parent `<SettingsContainer>`.
Throws if used outside the container so component misuse is loud.

```typescript
function useSettingsPanelContext(): SettingsPanelContextValue
```

### Constants

#### `SettingsPanelContext`

React context object for the settings panel; consume via `useSettingsPanelContext`.

```typescript
const SettingsPanelContext: Context<SettingsPanelContextValue | null>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-auth` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0
