---
'@molecule/app-search-ui-svelte': patch
---

Closing the quick-search dialog now removes only its own portaled content, leaving other elements in `document.body` (a toast container, a widget, another component's portal) untouched.
