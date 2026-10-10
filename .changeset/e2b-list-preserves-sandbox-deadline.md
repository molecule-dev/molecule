---
'@molecule/api-code-sandbox-e2b': patch
---

`list()` no longer resets the deadline of the sandboxes it enumerates: polling an account used to rewrite every running sandbox's timeout to the provider default, which paused sandboxes that had been kept alive and kept idle ones billing.
