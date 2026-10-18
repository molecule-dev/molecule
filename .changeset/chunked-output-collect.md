---
'@molecule/api-code-sandbox-flyio': patch
---

A detached command's output is collected in length-checked chunks, so a large stdout the Fly API silently truncates is retried in smaller reads instead of being returned short.
