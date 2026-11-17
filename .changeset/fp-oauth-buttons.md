---
'@molecule/app-locales-oauth-buttons': patch
'@molecule/app-oauth-buttons-angular': minor
'@molecule/app-oauth-buttons-react': minor
'@molecule/app-oauth-buttons-solid': minor
'@molecule/app-oauth-buttons-svelte': minor
'@molecule/app-oauth-buttons-vue': minor
---

A provider without a built-in label now renders through one fallback translation key that passes the provider name as a placeholder, instead of a translation key built at runtime. The locale bond adds that key in every language.
