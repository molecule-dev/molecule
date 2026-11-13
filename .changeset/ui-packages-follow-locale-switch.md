---
'@molecule/app-ui-vue': patch
'@molecule/app-ui-solid': patch
'@molecule/app-ui-svelte': patch
'@molecule/app-ui-angular': patch
'@molecule/app-angular': patch
---

UI components re-render their translated text on a locale switch, as `@molecule/app-ui-react` does; `@molecule/app-angular`'s `useTranslation().t` and `useT()` make the view that calls them follow a locale switch.
