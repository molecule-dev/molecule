# @molecule/api-database

## 1.2.1

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.2.0

### Minor Changes

- Add the SQL-compatibility type contract (a provider's declared capabilities, a requirement and a diagnostic) to the database core, and translate partial indexes for DuckDB without changing their semantics. The bond refuses a foreign-key referential action it cannot reproduce instead of dropping it.

## 1.1.4

### Patch Changes

- 25d125a: Reject malformed `findMany`, `findOne`, `count`, `updateMany` and `deleteMany` arguments with an actionable `TypeError` before running a query, instead of silently dropping the filter and reading every row.

## 1.1.3

### Patch Changes

- fdc4d89: The docs now state what the standalone `query(sql, values)` resolves to — one plain `{ rows, rowCount, fields? }` object with no `.get()`, `.all()` or `.run()` on it — so a caller written against better-sqlite3's `db.prepare(…).get()` result reads `rows[0]` instead of calling a method that does not exist.

## 1.1.2

### Patch Changes

- 8f29d60: `findMany`'s documentation now states the row order is unspecified unless `orderBy` is given: a `where` on an indexed column (`articleId`, `orderId`, `userId`) is answered from that index, so the rows come back in the index's order — not the order they were inserted in. Pass `orderBy` for every list whose order matters (`orderBy: [{ field: 'createdAt', direction: 'desc' }]`), and when no column encodes the intended order, store one (a `position` integer written from the array index).

## 1.1.1

### Patch Changes

- 60d0840: The README documents every export with its signature, parameters and return value, namespace members included.

## 1.1.0

### Minor Changes

- fe449e2: Adds `withTransaction(fn)`: every database call made inside `fn` (the CRUD helpers and `query()`) joins one transaction, committed when `fn` resolves and rolled back when it throws.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-i18n@1.0.1
