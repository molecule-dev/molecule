---
'@molecule/app-vite-config-default': patch
---

Preserve ESM initialization order across Rolldown production chunks so shared React contexts initialize before use.
