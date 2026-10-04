---
'@molecule/api-agent-runtime-pi': patch
---

Agent runs validate caller input before any exec (https GitHub repo URL, GitHub token shape, bare-hostname allowlist entries), authenticate the clone through an in-sandbox git credential helper so the token never rides the clone URL or git argv, probe every allowlisted egress host plus a blocked canary, and refuse sandbox providers that cannot enforce per-run egress.
