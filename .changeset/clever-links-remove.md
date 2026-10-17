---
'@molecule/api-ai-tools': patch
---

The installed-package guard now refuses only writes that would reach a real install: a `node_modules` entry that is a symlink (removing it deletes the link, not its target), one inside the run's own `.mol-scratch/`, or one with no `package.json` under it can be removed, while a real install stays read-only — including through a link. `installedPackageWriteRefusal` takes a filesystem probe and is async; `shellInstalledPackageProbe` builds one from a shell runner.
