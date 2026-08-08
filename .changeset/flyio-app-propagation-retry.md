---
'@molecule/api-code-sandbox-flyio': patch
---

Retry `create`'s machine POST through Fly's app-propagation 404 ("app not found") so a freshly-created app no longer intermittently fails the sandbox boot.
