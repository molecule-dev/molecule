---
'@molecule/app-ide-react': patch
---

A batch `read_file` card no longer renders a dangling comma when one of the requested paths has no file name (a trailing-slash path like `src/`).
