---
'@molecule/app-ide-react': minor
---

Adds an optional `onRestartBackend` escalation hook to the preview panel: when the backing server answers probes but the app has not confirmed a render for minutes and an automatic reload was already tried, the panel asks the host to restart the backing dev server — at most once per broken episode, with a long cooldown, never during a build. This recovers failure classes a document reload cannot (e.g. module failures cached against the dev server's immutable versioned URLs). Hosts that omit the prop are unaffected.
