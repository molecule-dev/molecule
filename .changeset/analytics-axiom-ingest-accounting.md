---
'@molecule/api-analytics-axiom': patch
---

A 200 that reports rejected events counts only the stored ones as sent, shutdown drains the queue and reports what was lost, ingest after shutdown is counted as dropped, and Retry-After on 429/503 is honoured.
