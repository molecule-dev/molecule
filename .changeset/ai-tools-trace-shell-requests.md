---
'@molecule/api-ai-tools': patch
---

A failed run's trace note no longer lists the page shell's own requests — a service worker, a manifest, a favicon, fonts, and build assets — as missing responses or as failures; a 404 on one of them is not a cause to fix.
