---
'@molecule/api-database-remote': patch
'@molecule/api-project-archive-external-state-postgresql': patch
'@molecule/api-project-archive-external-state-mysql': patch
---

The examples read the database password from the environment instead of writing it into the URL.
