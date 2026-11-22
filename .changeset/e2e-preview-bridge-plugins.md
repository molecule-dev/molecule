---
'@molecule/app-e2e-preview': minor
---

`@molecule/app-e2e-preview/vite` exports `stripPreviewBridgePlugin`, which keeps IDE preview bridges out of production builds, and the hub appends page console output to the file `MOL_PREVIEW_BROWSER_LOG` names.
