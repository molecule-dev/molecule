---
'@molecule/app-ui-solid': patch
---

Dropdown and FormField follow a trigger or children that change after mount, including ones rendered through `<For>` or `<Show>`, and FormField points its label at the field id again once it no longer holds a single control.
