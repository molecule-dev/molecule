---
'@molecule/app-utilities': patch
---

`copyToClipboard()` falls back to the copy command when the Clipboard API refuses a write. `copyToClipboard()` and `readFromClipboard()` are deprecated in favour of `@molecule/app-clipboard`.
