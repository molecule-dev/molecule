---
'@molecule/app-ide-react': patch
---

The file explorer follows storage changes after mount, so an asynchronous provider's persisted expand/collapse state hydrates the mounted tree instead of leaving it at the defaults.
