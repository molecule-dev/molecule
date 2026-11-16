---
'@molecule/app-clipboard': patch
---

`copyTextWithFallback()` falls back to the copy command when the bonded provider refuses the write, as it already did when no provider is bonded.
