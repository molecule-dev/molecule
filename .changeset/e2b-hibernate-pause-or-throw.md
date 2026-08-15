---
'@molecule/api-code-sandbox-e2b': patch
---

`hibernate()`, `stop()` and `sleep()` now pause the sandbox or throw — an SDK build with no pause method used to resolve a success-shaped `noop` outcome while the sandbox kept running. They prefer the supported `pause()` over the deprecated `betaPause()`, and treat an already-paused sandbox as success.
