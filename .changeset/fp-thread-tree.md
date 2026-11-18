---
'@molecule/app-feature-thread-tree-react': patch
---

The comment tree now uses plain nested list semantics, and the collapse toggle's `aria-expanded` and `aria-controls` attributes carry the state instead of an ARIA tree role.
