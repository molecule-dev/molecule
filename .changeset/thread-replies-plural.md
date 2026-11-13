---
'@molecule/app-message-bubble-react': patch
---

`ThreadIndicator` passes the reply count to `t()` as the plural count, so each locale picks its own singular or plural form.
