---
'@molecule/api-code-sandbox-flyio': patch
---

A failed archive import no longer leaves its partial download in the sandbox, and a boot that fails after allocating its Flycast private routes on an existing app now releases those addresses instead of stranding them.
