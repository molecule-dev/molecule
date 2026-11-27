---
'@molecule/app-ui-angular': patch
---

Accordion: give each accordion its own trigger and content ids, so two accordions on one page no longer share ids and each `aria-controls` and `aria-labelledby` points at its own accordion.
