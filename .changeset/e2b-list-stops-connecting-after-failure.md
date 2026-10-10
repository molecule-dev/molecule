---
'@molecule/api-code-sandbox-e2b': patch
---

`list()` stops starting new sandbox connects once one has failed, instead of connecting to every remaining sandbox on behalf of a call that already failed.
