# @molecule/app-settings-panel-solid

## 1.2.1

### Patch Changes

- Requires a framework binding version that refuses a routing bond too old to give it a router.

## 1.2.0

### Minor Changes

- Every framework exports `AccountValues`, `Tier`, `TierPrice`, `TwoFactorSetup`, `SettingsContainerProps` and `DevicesSectionProps`; the Angular package no longer exports `provideSettingsPanelContext`, which only its own container uses.

## 1.1.1

### Patch Changes

- Require the `@molecule/app-ui` version that has the ClassMap members these components use.

## 1.1.0

### Minor Changes

- Add `@molecule/app-settings-panel-vue`, `@molecule/app-settings-panel-solid`, `@molecule/app-settings-panel-svelte` and `@molecule/app-settings-panel-angular`: the composable settings panel and its section components for Vue, Solid, Svelte and Angular, matching `@molecule/app-settings-panel-react`.
