---
'@molecule/app-utilities': patch
---

`openUrl` strips leading control characters and spaces before reading the URL scheme, so a target like `\u0001javascript:…` is refused instead of passing as a relative path.
