---
'@molecule/app-ui-svelte': patch
---

Portal content (Modal, Drawer, Dropdown menu, Tooltip, ToastContainer) now renders through `BodyPortal` and unmounts with its owner, so opening and closing one no longer removes other nodes in `document.body`, and a Dropdown between keyed siblings no longer leaves its trigger behind.
