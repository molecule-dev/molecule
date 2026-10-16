---
'@molecule/app-vite-config-default': patch
---

`vite preview` proxies `/api`, `/health` and `/socket.io` like the dev server, so the production bundle can be tested locally.
