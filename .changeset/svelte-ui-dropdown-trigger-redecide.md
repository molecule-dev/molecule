---
'@molecule/app-ui-svelte': patch
---

Dropdown switches between the trigger's own element and the role="button" fallback whenever the trigger snippet starts or stops spreading the menu-button props, so an emptied and refilled trigger is wired again.
