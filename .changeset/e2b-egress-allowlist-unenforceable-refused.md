---
'@molecule/api-code-sandbox-e2b': patch
---

Applying a non-empty egress allow-list to a sandbox that cannot enforce one now fails with an error instead of silently leaving the sandbox with unrestricted outbound traffic.
