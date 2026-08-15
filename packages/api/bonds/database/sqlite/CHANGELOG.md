# @molecule/api-database-sqlite

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
