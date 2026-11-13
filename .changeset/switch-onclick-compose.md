---
'@molecule/app-ui-react': patch
---

`Switch` runs a caller's `onClick` before toggling (and skips the toggle when it calls `preventDefault()`) instead of letting it replace the toggle.
