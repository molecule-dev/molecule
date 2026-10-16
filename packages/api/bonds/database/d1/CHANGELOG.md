# @molecule/api-database-d1

## 1.0.16

### Patch Changes

- d6b201c: A statement that fails now names itself: the D1 error keeps its class and code and carries the one-line SQL in its message and on `sql`, the same rule the SQLite bond applies to better-sqlite3. The bound values are never included.
- Updated dependencies [608805b]
- Updated dependencies [bb676b3]
  - @molecule/api-database-sqlite@1.2.5

## 1.0.15

### Patch Changes

- Updated dependencies [4a30c85]
  - @molecule/api-database-sqlite@1.2.4

## 1.0.14

### Patch Changes

- Updated dependencies [ac33c4b]
- Updated dependencies [ff8c42c]
  - @molecule/api-database-sqlite@1.2.3

## 1.0.13

### Patch Changes

- Updated dependencies [8cb65bb]
  - @molecule/api-database-sqlite@1.2.2

## 1.0.12

### Patch Changes

- Updated dependencies [7b3653a]
- Updated dependencies [42bcebb]
  - @molecule/api-database-sqlite@1.2.1

## 1.0.11

### Patch Changes

- Updated dependencies [390283d]
  - @molecule/api-database-sqlite@1.2.0

## 1.0.10

### Patch Changes

- Updated dependencies [3293f6f]
  - @molecule/api-database-sqlite@1.1.3

## 1.0.9

### Patch Changes

- Updated dependencies [68ac2bd]
  - @molecule/api-database-sqlite@1.1.2

## 1.0.8

### Patch Changes

- Updated dependencies [99e5a84]
  - @molecule/api-database-sqlite@1.1.1

## 1.0.7

### Patch Changes

- Updated dependencies [a8cce33]
- Updated dependencies [a8cce33]
  - @molecule/api-database-sqlite@1.1.0

## 1.0.6

### Patch Changes

- Updated dependencies [a5cdced]
  - @molecule/api-database-sqlite@1.0.5

## 1.0.5

### Patch Changes

- 22f9459: Importing this server-only package into a browser bundle now fails immediately with a message naming the package, instead of a confusing error from deep inside a dependency.

## 1.0.3

### Patch Changes

- Updated dependencies [9ea501c]
  - @molecule/api-database-sqlite@1.0.3

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

- Updated dependencies [348632c]
  - @molecule/api-database-sqlite@1.0.2
