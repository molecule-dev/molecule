---
'@molecule/api-database-postgresql': patch
'@molecule/api-database-sqlite': patch
'@molecule/api-database-mysql': patch
---

Accept hyphenated table/column identifiers (e.g. `resource-share-links`). Every interpolation site quotes identifiers, so hyphens are safe; the previous allowlist rejected `@molecule/api-resource-share`'s tables, making every share-link operation throw.
