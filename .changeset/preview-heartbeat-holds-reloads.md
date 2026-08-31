---
'@molecule/app-ide-react': patch
---

The preview's stuck-load recovery no longer reloads a heartbeating document: the inline bridge heartbeats from HTML-parse time, so liveness means the module graph is still loading — reloading it aborted every in-flight module fetch and could trap large apps (slow module graphs behind a proxy) in a permanent reload-and-blank loop. Recovery still fires for a genuinely dead document.
