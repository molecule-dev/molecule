---
'@molecule/api-code-sandbox-e2b': patch
---

An archive import spools the bytes each chunk carried when it was yielded, so a producer that reuses one buffer no longer corrupts the imported tree.
