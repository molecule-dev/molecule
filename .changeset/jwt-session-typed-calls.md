---
'@molecule/api-jwt': patch
---

The session guidance now names the typed calls: mint the device id with `get<DeviceService>('device')?.createOrUpdate(userId, deviceName)` — it resolves to the id string, not a row — before `authorization.set(req, res, { userId, deviceId })`.
