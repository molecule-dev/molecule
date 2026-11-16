---
'@molecule/app-inline-edit-angular': patch
'@molecule/app-inline-edit-react': patch
'@molecule/app-inline-edit-solid': patch
'@molecule/app-inline-edit-svelte': patch
'@molecule/app-inline-edit-vue': patch
'@molecule/app-locales-inline-edit': patch
---

The editor field's fallback accessible label is now looked up through i18n, so it follows the app's locale instead of staying in English. The locale bond adds the `inlineEdit.aria.edit` key in every language.
