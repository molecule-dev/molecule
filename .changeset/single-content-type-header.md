---
'@molecule/api-http': patch
---

Send a single Content-Type when the caller already sets one in any letter case, so JSON bodies are not dropped by the server.
