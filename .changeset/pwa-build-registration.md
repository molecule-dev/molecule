---
'@molecule/app-pwa-default': patch
'@molecule/app-vite-config-default': patch
---

Register the production service worker independently of the app entry, keep registration idempotent, and leave server navigations on the network.
