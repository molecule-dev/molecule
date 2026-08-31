---
'@molecule/app-ide-react': patch
---

Read-only viewers no longer auto-send the initial prompt on mount (a stale project-keyed prompt could start a turn the server rejects) and the auto-fix countdown can never dispatch a fix turn from a viewer's client.
