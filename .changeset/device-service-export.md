---
'@molecule/api-resource-device': patch
---

`DeviceService` is exported from the package root, so the interface a caller writes at the call site — `get<DeviceService>('device')` — can be imported by name rather than re-declared as an inline generic. The `types` namespace export is unchanged.
