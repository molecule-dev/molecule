---
'@molecule/app-auth': patch
---

`createBrowserStorageAdapter` now documents that a stored token and user restore the session synchronously with no request, so an app should render from that state and never block its first paint on its own profile request.
