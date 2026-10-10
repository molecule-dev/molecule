---
'@molecule/app-ide-react': patch
---

A batch `read_file` card now opens the file each listed name belongs to when one of the requested paths has no file name (a trailing-slash path like `src/`), instead of opening that path.
