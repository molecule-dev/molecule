---
'@molecule/app-ui-solid': patch
---

Portal content (Modal, Dropdown menu, Tooltip, ToastContainer and the app-shell overlays) now renders through `BodyPortal`, so a `<Show>`, `<For>` or text child no longer throws and each portal unmounts with its owner.
