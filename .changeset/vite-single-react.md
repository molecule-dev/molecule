---
'@molecule/app-vite-config-default': patch
---

Pins `react` and `react-dom` to the one copy the app resolves, adds `react-router-dom` to `dedupe`, and force-includes only optimize dependencies that are installed.
