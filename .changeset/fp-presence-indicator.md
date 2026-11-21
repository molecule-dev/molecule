---
'@molecule/app-presence-indicator-angular': patch
'@molecule/app-presence-indicator-react': patch
'@molecule/app-presence-indicator-solid': patch
'@molecule/app-presence-indicator-svelte': patch
'@molecule/app-presence-indicator-vue': patch
---

The default accessible label is looked up through the active locale's presence keys instead of a fixed English string, with the status word translated too. An explicit `ariaLabel` still overrides it.
