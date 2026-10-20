# @molecule/api-database-sqlite

## 1.3.1

### Patch Changes

- 2f50d9e: Keep SQL files in separate migration namespaces independent while preserving recorded legacy migrations.

## 1.3.0

### Minor Changes

- 7b65737: Registers a critical database readiness probe and a pool-closing shutdown hook when @molecule/api-process-lifecycle is present.

## 1.2.6

### Patch Changes

- ecaf7de: `ALTER TABLE … DROP COLUMN IF EXISTS` now applies on SQLite: the migrator drops the statement when the table has no such column (the no-op Postgres performs) and strips the clause SQLite cannot parse. A migration written with it used to fail the run — and an app booting on a fresh production database that never had the column could not start.
- c5e34dd: Column reconciliation after a `CREATE TABLE IF NOT EXISTS` now only runs for the migration file that CREATES a table, and never adds a `NOT NULL` column with no default. Before, a rewritten — and then deleted — older migration silently added a column to another file's table, and every insert that did not write it failed.

## 1.2.5

### Patch Changes

- 608805b: A statement that fails now names itself: the error keeps its class and code and carries the one-line SQL in its message and on `sql`, so `datatype mismatch` and `no such table` say which statement hit them. The bound values are never included. `DataStore` queries put the table they were asked for in front of that statement.
- bb676b3: `convertPlaceholders` refuses a statement whose `$N` placeholders and supplied values disagree — a value that no placeholder names, or a placeholder with no value — instead of dropping the value (or binding `NULL`) in silence and returning the wrong rows. The error names the placeholder and the statement, matching the contract PostgreSQL enforces at bind time.

## 1.2.4

### Patch Changes

- 4a30c85: The README states that a `@molecule/api-resource-*` package's `src/__setup__/*.sql` is Postgres dialect that the migrator translates, so a package's schema should be copied into `api/migrations/` as it is — a hand-written SQLite version of it drifts from the schema the package's own queries expect.

## 1.2.3

### Patch Changes

- ac33c4b: A list given to a one-value operator (`=`, `!=`, `<`…) throws instead of silently matching nothing.
- ff8c42c: A "no such column" or "no such table" error names the table the statement was for.

## 1.2.2

### Patch Changes

- 8cb65bb: An unknown query operator's error lists the valid operators, which are lowercase.

## 1.2.1

### Patch Changes

- 7b3653a: A migration's `ALTER TABLE … ADD COLUMN IF NOT EXISTS` is applied only when the column is missing, instead of failing the whole file and warning about it on every boot.
- 42bcebb: Timestamp columns declared with a `DEFAULT now()` / `DEFAULT CURRENT_TIMESTAMP` default now store ISO-8601 UTC values with milliseconds (e.g. `2026-10-16T01:22:21.416Z`) instead of SQLite's space-separated whole-second form, so a stored timestamp parses as the UTC instant it was written and two rows written in the same second sort in insertion order.

## 1.2.0

### Minor Changes

- 390283d: Migrations are recorded in a `_molecule_migrations` table, so each file runs once; a database migrated before is adopted on its first boot, and SQLite ignores `--` comments when it adds columns declared in a `CREATE TABLE`.

## 1.1.3

### Patch Changes

- 3293f6f: Migrations translate `ADD COLUMN IF NOT EXISTS` to `ADD COLUMN`, which SQLite can run.

## 1.1.2

### Patch Changes

- 68ac2bd: Re-running migrations adds a column that a `CREATE TABLE IF NOT EXISTS` declares but the existing table lacks.

## 1.1.1

### Patch Changes

- 99e5a84: A create without an id on a table whose id is `INTEGER PRIMARY KEY` lets SQLite number the row instead of inserting a uuid.

## 1.1.0

### Minor Changes

- a8cce33: Queries made inside `withTransaction()` from `@molecule/api-database` run on its transaction.

### Patch Changes

- a8cce33: A query that waits 30 s behind an open transaction fails with an error naming `withTransaction()` instead of waiting forever.

## 1.0.5

### Patch Changes

- a5cdced: Document how migrations apply and which placeholders `pool.query` accepts.

## 1.0.3

### Patch Changes

- 9ea501c: Accept hyphenated table/column identifiers (e.g. `resource-share-links`). Every interpolation site quotes identifiers, so hyphens are safe; the previous allowlist rejected `@molecule/api-resource-share`'s tables, making every share-link operation throw.

## 1.0.2

### Patch Changes

- 348632c: Add Cloudflare Workers bonds: `@molecule/api-scheduler-cloudflare` and
  `@molecule/api-database-d1`.

  Running a molecule API on Workers was not a porting problem, it was a missing
  pair of bonds. Application code is unchanged; only `bonds/` differs.

  **`api-scheduler-cloudflare`** — `api-scheduler-default` keeps tasks alive with
  `setInterval`, which needs a long-lived process a Worker does not have. This
  provider registers tasks and runs them from the Worker's `scheduled()` handler
  via `runDueTasks()`, driven by Cron Triggers. `intervalMs` is NOT honoured by
  default and that is deliberate: an isolate is short-lived, so "when did this
  last run" is not reliably known, and skipping on that basis can mean a task
  never runs. The trigger schedule is the schedule. `TaskStatus.nextRunAt` is
  always `null` rather than a computed guess, and `runDueTasks()` never rejects,
  so one failing task cannot fail the invocation and trigger a platform retry
  that re-runs the tasks that already succeeded.

  **`api-database-d1`** — D1 _is_ SQLite, so this reuses the sqlite bond's
  dialect verbatim and replaces only the pool (`better-sqlite3` is a synchronous
  native binding; D1 is an async platform binding). This was cheap because
  `createStore()` was already written against the abstract `DatabasePool` rather
  than its driver. Verified the built package's import graph never reaches
  `better-sqlite3`, which is what lets it run in an isolate at all. The D1
  binding is passed in, never discovered — Worker bindings arrive per-invocation
  on `env`. `pool.transaction` is left `undefined` rather than faked, because D1
  has no interactive transactions and a rollback that reports success without
  happening is worse than an absent capability.

  **`api-database-sqlite`** gains `./store.js` and `./utilities.js` subpath
  exports so the driver-free dialect can be imported without pulling the native
  driver into a Workers bundle.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-database@1.0.1
  - @molecule/api-secrets@1.0.1
