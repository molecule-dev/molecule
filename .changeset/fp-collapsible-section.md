---
'@molecule/app-collapsible-section-angular': patch
'@molecule/app-collapsible-section-react': patch
'@molecule/app-collapsible-section-solid': patch
'@molecule/app-collapsible-section-svelte': patch
'@molecule/app-collapsible-section-vue': patch
---

The toggle button now wraps only the label, with `actions` beside it in the same header row. Anything passed to `actions` may therefore contain buttons and links, and a click there does not toggle the section.
