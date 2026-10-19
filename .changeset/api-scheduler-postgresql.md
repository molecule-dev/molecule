---
'@molecule/api-scheduler-postgresql': minor
---

First release of the PostgreSQL-coordinated scheduler: a per-task advisory lock held for the interval makes a scheduled task run once across every API instance.
