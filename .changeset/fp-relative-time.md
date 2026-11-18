---
'@molecule/app-relative-time-angular': patch
'@molecule/app-relative-time-react': patch
'@molecule/app-relative-time-solid': patch
'@molecule/app-relative-time-svelte': patch
'@molecule/app-relative-time-vue': patch
---

`locale` now defaults to the app's active locale, so the label follows a locale switch; an explicit `locale` still wins. All five framework packages behave the same way.
