---
'@molecule/app-ide-react': patch
---

PreviewPanel: the steady-state health probe now allows 5s and requires two consecutive misses before treating the app as down, so a preview behind a remote edge is no longer reloaded on a single slow probe.
