---
'@molecule/app-settings-panel-react': minor
'@molecule/app-settings-panel-vue': minor
'@molecule/app-settings-panel-solid': minor
'@molecule/app-settings-panel-angular': major
---

Every framework exports `AccountValues`, `Tier`, `TierPrice`, `TwoFactorSetup`, `SettingsContainerProps` and `DevicesSectionProps`; the Angular package no longer exports `provideSettingsPanelContext`, which only its own container uses.
