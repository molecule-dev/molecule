---
'@molecule/app-ide-react': patch
---

The preview's health probe no longer declares a heartbeating page down and reloads it while the sandbox is busy; only a page whose heartbeat has stopped is reloaded when the server answers again.
