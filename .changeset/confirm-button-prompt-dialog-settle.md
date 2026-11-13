---
'@molecule/app-ui-react': patch
---

ConfirmButton no longer leaks an unhandled rejection when `onConfirm` rejects, and PromptDialog accepts the next submit when its parent keeps it open after a successful one.
