---
'@molecule/api-code-sandbox-e2b': patch
---

Declare `hostingCapabilities` as unfit for long-lived public hosting (sandboxes have bounded lifetimes and no routable address) so capability-gated wiring refuses the role by default.
