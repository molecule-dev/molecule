---
'@molecule/api-ai-tools': patch
---

A failed Playwright run whose pages never loaded now leads with the browser's own `net::ERR_*` on the document request, naming the document it hit.
