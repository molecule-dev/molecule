---
'@molecule/app-angular': minor
---

Add renderedParent, which finds an element's parent in the rendered tree even when a host has left the page, and setHostRoot, which sends what a caller binds on such a host's tag (attributes, classes, styles, listeners) to the element that stands in for it; RoutedView now renders the page with no element of its own.
