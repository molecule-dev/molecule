---
'@molecule/app-react': patch
---

`useEditor` reads `activeFile` from the provider's tab list at mount and after every tab action, including `openDiff` and `closeDiff`.
