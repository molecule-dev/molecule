---
'@molecule/api-code-sandbox-e2b': patch
---

`exportFiles(path)` now roots the archive at the last segment of `path` (`my-app/…`), matching the core contract and the Docker bond, and shell-quotes paths in `exportFiles`/`importFiles`.
