# @molecule/app-settings-panel-react

## 5.0.0

### Major Changes

- `BillingSection` requires `upgradeTo`, the page its Upgrade button opens, instead of defaulting to `/settings`; without one it shows no Upgrade button.

### Minor Changes

- `TiersUpgradeSection` offers Upgrade only when a price is for sale, reads the plan and `isFree` from the billing status (reloading it after a cancel), and shows a failed cancel in the section.

## 4.4.0

### Minor Changes

- `AuthSection` takes a `twoFactor` option (default `true`); set it to `false` to hide two-factor settings when the API has no two-factor provider.

## 4.3.0

### Minor Changes

- Read the router through `@molecule/app-react` instead of React Router, so these components work under any routing bond; a guard or layout without children renders the binding's `RoutedView`.

### Patch Changes

- Requires a framework binding version that refuses a routing bond too old to give it a router.

## 4.2.0

### Minor Changes

- Every framework exports `AccountValues`, `Tier`, `TierPrice`, `TwoFactorSetup`, `SettingsContainerProps` and `DevicesSectionProps`; the Angular package no longer exports `provideSettingsPanelContext`, which only its own container uses.

### Patch Changes

- `DevicesSection` ignores a device list that arrives after it unmounts, and `SettingsContainer` keeps its context value stable while `onClose` keeps its identity.

## 4.1.1

### Patch Changes

- Require the `@molecule/app-ui` version that has the ClassMap members these components use.

## 4.1.0

### Minor Changes

- Show the server's message when an account, two-factor or checkout action is refused, add a `redirectToCheckout` prop to `TiersUpgradeSection`, read the device's online state through `useDevice`, give every label an English default, and re-export the current-device push toggle from `@molecule/app-push`.

## 4.0.3

### Patch Changes

- Read the signed-in user's id and OAuth provider through the typed `UserProfile` fields.
- Every error and label these packages show has one English text that matches its locale bond and is translated in every supported language; values are passed as {{placeholders}} instead of being written into the English.

## 4.0.2

### Patch Changes

- Rejections that were discarded silently are now logged, or kept as commented no-ops where ignoring them is correct.

## 4.0.1

### Patch Changes

- Feature components style through ClassMap tokens instead of raw class names, so a styling bond swap restyles them too; the Tailwind bond renders the same classes as before.

## 4.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@4.0.0
  - @molecule/app-ui-react@4.0.0

## 3.0.3

### Patch Changes

- Keep saved profiles current in React auth hooks and account settings, guard against stale session reads, and revalidate access-only sessions.

## 3.0.2

### Patch Changes

- AccountSection saves the name of accounts without an email, validates a non-empty email inline, and never sends a blank email.

## 3.0.1

### Patch Changes

- Use the shared profile lifecycle for account edits.

## 3.0.0

### Patch Changes

- Updated dependencies
  - @molecule/app-react@3.0.0
  - @molecule/app-ui-react@3.0.0

## 2.0.0

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @molecule/app-auth@3.0.0
  - @molecule/app-react@2.0.0
  - @molecule/app-ui-react@2.0.0

## 1.0.7

### Patch Changes

- Accept `@molecule/app-auth` 2.x alongside 1.x. The auth types this package reads are
  unchanged across both majors.

## 1.0.5

### Patch Changes

- Push-notification Switch carries aria-label — the visible text was a sibling span, so the control was announced as a bare "switch".

## 1.0.4

### Patch Changes

- Confirmations and toggles now use the shared `ConfirmDialog`, `ConfirmButton` and `Switch` from `@molecule/app-ui-react` instead of `window.confirm` and hand-built controls.

## 1.0.3

### Patch Changes

- The push-notifications switch has an accessible name.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-auth@1.0.1
  - @molecule/app-react@1.0.1
  - @molecule/app-ui@1.0.1
  - @molecule/app-ui-react@1.0.1
