---
'@molecule/api-resource-user': patch
---

Log in now derives its dummy password hash once per process even when several invalid-credential requests arrive at the same time, instead of running one full-cost hash per concurrent request.
