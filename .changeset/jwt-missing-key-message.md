---
'@molecule/api-jwt-jsonwebtoken': patch
---

The missing-key errors name the fix: call `sign()` / `verify()` from `@molecule/api-jwt`, which pass the configured keys.
