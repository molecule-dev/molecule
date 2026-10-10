---
'@molecule/api-analytics-http': patch
---

Every emit now releases the response body it never reads, instead of holding a connection until garbage collection on each call against a dead or erroring endpoint.
