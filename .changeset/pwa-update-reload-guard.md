---
'@molecule/app-pwa-default': patch
---

Reload only after the new service worker takes control. Clicking "Update" could previously reload before the waiting worker activated, leaving the old cached bundle in place until another refresh.
