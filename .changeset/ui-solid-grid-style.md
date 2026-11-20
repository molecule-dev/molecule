---
'@molecule/app-ui-solid': patch
---

`Grid` sets only the gap and template properties it is given, so an unset one no longer erases the same property from the caller's `style`.
