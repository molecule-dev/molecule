---
'@molecule/app-list-item-row-angular': patch
'@molecule/app-list-item-row-react': patch
'@molecule/app-list-item-row-solid': patch
'@molecule/app-list-item-row-svelte': patch
'@molecule/app-list-item-row-vue': patch
---

The row's open action sits on a transparent native button covering the whole row, named by the title, so keyboard and mouse users get the same action while the actions slot keeps its own clicks. `selected` now sets `aria-current="true"` instead of `aria-selected`.
