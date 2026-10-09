---
'@molecule/api-code-sandbox-flyio': patch
---

get() now throws when the Fly API cannot be reached, so a transient failure is no longer reported as a missing sandbox.
