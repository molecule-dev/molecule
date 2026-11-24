# @molecule/app-settings-panel-angular

## 3.0.1

### Patch Changes

- `BillingSection` with no `plan` shows the translated `settings.billing.freePlan` instead of an English "Free".

## 3.0.0

### Major Changes

- `BillingSection` requires `upgradeTo`, the page its Upgrade button opens, instead of defaulting to `/settings`; without one it shows no Upgrade button.

### Minor Changes

- `TiersUpgradeSection` offers Upgrade only when a price is for sale, reads the plan and `isFree` from the billing status (reloading it after a cancel), and shows a failed cancel in the section.

## 2.1.0

### Minor Changes

- `AuthSection` takes a `twoFactor` option (default `true`); set it to `false` to hide two-factor settings when the API has no two-factor provider.

## 2.0.2

### Patch Changes

- Their providers and sections render with no host element of their own and find their context through the rendered tree.
- Wrappers, empty states and slots that depend on projected content now update in the same render pass as that content.

## 2.0.1

### Patch Changes

- Requires a framework binding version that refuses a routing bond too old to give it a router.

## 2.0.0

### Major Changes

- Every framework exports `AccountValues`, `Tier`, `TierPrice`, `TwoFactorSetup`, `SettingsContainerProps` and `DevicesSectionProps`; the Angular package no longer exports `provideSettingsPanelContext`, which only its own container uses.

## 1.1.1

### Patch Changes

- Require the `@molecule/app-ui` version that has the ClassMap members these components use.

## 1.1.0

### Minor Changes

- Add `@molecule/app-settings-panel-vue`, `@molecule/app-settings-panel-solid`, `@molecule/app-settings-panel-svelte` and `@molecule/app-settings-panel-angular`: the composable settings panel and its section components for Vue, Solid, Svelte and Angular, matching `@molecule/app-settings-panel-react`.
