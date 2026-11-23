---
'@molecule/app-ui-angular': patch
---

Style objects that set a shorthand and a longhand it covers (`gap` then `columnGap`) apply in the order written, as React applies them, instead of Angular's alphabetical order.
