---
'@molecule/api-ai-tools': patch
---

A 401/403 trace note now names which side refused the request: no `Authorization` header means the client never attached the token, a header means the server rejected it.
