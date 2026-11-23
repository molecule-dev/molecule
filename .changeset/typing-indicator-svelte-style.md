---
'@molecule/app-typing-indicator-svelte': patch
---

The indicator's keyframes `<style>` element is now part of the template instead of inserted into the DOM by an action, so it renders on the server too and the component never moves a node Svelte placed.
