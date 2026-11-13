---
'@molecule/app-svelte': patch
---

`useTranslation().t` and `useT()` called in markup now re-render on a locale switch, and `createI18nStores().t` passes the `defaultValue` option through to the provider.
