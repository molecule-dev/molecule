---
'@molecule/app-ide-react': patch
---

The preview panel honours a `molecule:viewport` request from the previewed page (an e2e spec's `page.setViewportSize`), sizing the frame like a device preset until a device is picked again.
