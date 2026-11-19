---
'@molecule/app-ui': patch
---

A handler written for the event a kit passes, such as `(event: Event) => void` on the Vue, Solid, Svelte and Angular kits, is accepted by the kits' handler props again; an unannotated handler's event is still `KitEvent`.
