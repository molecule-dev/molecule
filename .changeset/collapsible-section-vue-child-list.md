---
'@molecule/app-collapsible-section-vue': patch
---

`ShowMore` and `CollapsibleSection` count slot content the way React counts children, so a `v-for` list is sliced per item and a false `v-if` adds nothing.
