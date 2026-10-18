---
'@molecule/app-ide-react': patch
---

The preview panel tracks whether the current document has fired `load` in the same commit that mounts it, so a page that loads but never renders is reported as blank instead of leaving the preview on a loading status.
