---
'@molecule/app-settings-panel-react': patch
---

`DevicesSection` ignores a device list that arrives after it unmounts, and `SettingsContainer` keeps its context value stable while `onClose` keeps its identity.
