---
'@molecule/app-auth': patch
'@molecule/app-bonds-default-react': patch
---

The auth docs name the one request a registered gate must exempt: an app whose own session store restores through the bonded HTTP client sends that request with `skipAuthGate: true`, or the gate holds the request it is waiting for. The shipped restore never needs it — it sends its current-user request with `fetch`, so the gate the default auth bonds register cannot hold it.
