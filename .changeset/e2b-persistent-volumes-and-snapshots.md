---
'@molecule/api-code-sandbox-e2b': minor
---

Persist a project's files beyond its sandbox: `create()` mounts a named volume at a caller-chosen path, `createVolume`/`removeVolume`/`volumeExists`/`listVolumes` manage volumes, and `commitTemplate`/`getTemplate`/`listTemplates`/`removeTemplate` capture and restore sandboxes as E2B snapshots.
