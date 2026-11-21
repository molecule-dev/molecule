---
'@molecule/app-ticker-row-angular': patch
'@molecule/app-ticker-row-react': patch
'@molecule/app-ticker-row-solid': patch
'@molecule/app-ticker-row-svelte': patch
'@molecule/app-ticker-row-vue': patch
---

The percentage change is formatted in the active locale and colored with the theme's success and error tones instead of fixed hex colors. With `onClick` the whole row is a native button named by the symbol, so it works from the keyboard, and the Vue, Solid, Svelte and Angular ports match it.
