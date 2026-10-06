---
'@molecule/api-server-default-express': patch
---

HTTPS mode now loads `pem` correctly from this ES module and says how to install it when missing; `pem` is declared as an optional peer dependency.
