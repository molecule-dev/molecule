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

### Functions

#### `AccountSection()`

Email-editing section. Fetches `/users/me` on mount to refresh the
current user record (and write it back to the auth cache so
subsequent reloads see the latest data). On blur of the email
field, PATCHes `/api/users/:id` with the new email; reverts + shows
an inline error if the request fails.

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

Authentication section — change password (modal) + toggle two-factor.

Auto-hides for OAuth-only users (`user.oauthServer` truthy) since
password / 2FA wouldn't apply.

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

Devices section — lists the user's registered devices.

Each row renders a chevron-right icon by default (matching the
canonical fleet pattern). Apps that want a different icon can pass
a `renderRowIcon` callback; pass `() => null` to suppress entirely.

```typescript
function DevicesSection({
  renderRowIcon,
}?: { renderRowIcon?: (device: Device) => ReactNode; }): JSX.Element
```

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

Push-notification toggle section. Requests browser permission +
registers/unregisters the push subscription via `@molecule/app-push`.

```typescript
function NotificationsSection(): JSX.Element
```

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
