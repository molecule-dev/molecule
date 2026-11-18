---
'@molecule/app-ui-vue': patch
'@molecule/app-ui-solid': patch
'@molecule/app-ui-svelte': patch
'@molecule/app-ui-angular': patch
---

`Dropdown` no longer reports `openChange(false)` on mount, so a controlled menu mounted open stays open when its owner follows `openChange`.
