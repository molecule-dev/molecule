---
'@molecule/app-e2e-preview': patch
---

`role=page` WebSocket upgrades are now gated like the driver side: a same-origin `Origin` check (the shipped page client connects to its own `location.host`) or the hub token is required — a cross-origin site on a dev machine can no longer connect as a page and receive/spoof driver commands and results.
