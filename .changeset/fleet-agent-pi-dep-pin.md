---
'@molecule/api-agent-transcript-autodetect': patch
'@molecule/api-agent-runtime-pi': patch
---

Pin `@molecule/api-agent-transcript-pi` to 1.0.1 — 1.2.0 of autodetect shipped a dependency on a version npm will never serve (the bond moved to 1.0.1 before its first publish), making autodetect 1.2.0 uninstallable from the registry.
