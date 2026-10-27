---
'@molecule/api-code-sandbox': minor
---

Add an optional `hostingCapabilities` declaration to `SandboxProvider` so a platform can refuse, at wiring time, a provider that cannot host long-lived publicly routable instances — instead of discovering it at a deploy's health gate.
