---
'@molecule/app-ide-react': patch
---

The preview's freeze watchdog reports a frozen page only after the current document has heartbeat at least once; a page that has just reloaded and is still loading is not reported as frozen.
