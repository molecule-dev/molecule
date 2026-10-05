---
'@molecule/api-database-postgresql': patch
---

The migrator no longer prints the full `DATABASE_URL` (and the password in it) when it cannot connect; it names the host and database only.
