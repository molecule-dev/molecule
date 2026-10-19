---
'@molecule/api-ai-tools': patch
---

A 401 with no `Authorization` header is diagnosed as a missing client token only when the trace shows the same context had signed in; a signed-out route test now points at its redirect guard instead.
