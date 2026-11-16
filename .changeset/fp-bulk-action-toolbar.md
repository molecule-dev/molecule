---
'@molecule/app-bulk-action-toolbar-angular': patch
'@molecule/app-bulk-action-toolbar-react': patch
'@molecule/app-bulk-action-toolbar-solid': patch
'@molecule/app-bulk-action-toolbar-svelte': patch
'@molecule/app-bulk-action-toolbar-vue': patch
'@molecule/app-locales-bulk-action-toolbar': patch
---

The toolbar's accessible name is looked up through the `bulkActions.aria.toolbar` translation key instead of a fixed English string, so it follows the active language. The locale bond adds that key in every language.
