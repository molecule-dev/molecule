---
'@molecule/api-code-sandbox-e2b': patch
---

exec() clears the timers its wait race armed, so a command that finished no longer holds the process's event loop open for the grace window.
