---
'@molecule/app-e2e-fixtures-default': minor
---

`page.setViewportSize()` now survives a navigation: the size is re-applied after every `goto`, `reload`, `goBack` and `goForward`, so a spec that sets a phone width keeps measuring at that width. The re-apply warns rather than throwing when the host does not honour it, and `page.viewportSize()` reports the size actually in effect.
