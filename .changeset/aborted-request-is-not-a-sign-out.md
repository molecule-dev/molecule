---
'@molecule/app-http': minor
---

An aborted request is now distinguishable without parsing its message: `HttpError` carries `aborted`, uses the `http.error.aborted` key, and `isAuthFailure`/`isNoResponse` classify a failure correctly (a status of 0 is never an auth failure).
