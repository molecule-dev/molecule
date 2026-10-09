---
'@molecule/api-code-sandbox-e2b': patch
---

`list()` connects to all running sandboxes concurrently instead of one round trip at a time, so enumerating a fleet costs one connect latency rather than one per sandbox.
