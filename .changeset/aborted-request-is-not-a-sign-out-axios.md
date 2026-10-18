---
'@molecule/app-http-axios': patch
---

A cancelled request (`ERR_CANCELED`) is flagged `aborted` with the `http.error.aborted` key, matching the fetch provider.
