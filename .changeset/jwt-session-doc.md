---
'@molecule/api-jwt': patch
---

`sign()` is documented as the low-level signer: a token it mints is not a session, because the app's session middleware accepts a JWT only when its payload also carries a `deviceId` naming an active device row — the doc now names `authorization.set()` in `@molecule/api-resource-user` as the function that mints one the middleware accepts.
