---
'@molecule/api-resource-user': patch
---

`authorization.set()` refuses to mint a session without a `deviceId`. The global `verifyMiddleware` exposes a session only when its payload carries a device id naming an active `devices` row, so a token signed without one was handed to the client and then answered 401 on every request, with nothing said at sign-in. It now throws, naming the missing field and the call that supplies it: `get<DeviceService>('device')?.createOrUpdate(userId, deviceName)`, which resolves to the device id string. The sign-in sequence — device, then session — is documented on `set()` and in the package's module docs, with the typed calls for both steps.
