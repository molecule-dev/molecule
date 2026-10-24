/**
 * SQLite's SQL capability declaration — what this bond can honour from the
 * PostgreSQL-dialect setup library.
 *
 * `@molecule/api-database` defines the contract (`SqlCapabilities`); the same
 * data is mirrored into this package's `mlcl/registry.json` entry so the CLI can
 * preflight a resource selection without opening a database file.
 *
 * SQLite implements all three constructs natively. Two details of THIS bond make
 * the declaration true rather than theoretical:
 *
 * - the pool enables `PRAGMA foreign_keys = ON` on every connection, because
 *   SQLite parses a foreign key without enforcing it unless the pragma is set;
 * - `translateDdlToSqlite` rewrites Postgres type/function syntax but leaves
 *   `CREATE INDEX ... WHERE ...` untouched, because SQLite supports it.
 *
 * Both were exercised on the real engine (`better-sqlite3`, the bond's own
 * dependency) in the candidate's engine controls.
 *
 * @module
 */

import type { SqlCapabilities } from '@molecule/api-database'

/**
 * What the SQLite bond supports from PostgreSQL-dialect migrations.
 *
 * `fk-referential-action` is `native` only because the pool turns on
 * `PRAGMA foreign_keys` for every connection — the declaration and
 * `sqlite/src/pool.ts` must stay in step.
 */
export const sqlCapabilities: SqlCapabilities = {
  'fk-referential-action': {
    support: 'native',
    note:
      'SQLite enforces the action when PRAGMA foreign_keys = ON, which this bond sets ' +
      'on every connection; ON DELETE CASCADE was verified on the real engine.',
  },
  'partial-index': {
    support: 'native',
    note:
      'SQLite supports partial indexes; the bond passes the statement through with only ' +
      'Postgres type/function syntax translated.',
  },
  'unique-partial-index': {
    support: 'native',
    note:
      'SQLite supports UNIQUE partial indexes; only rows matching the predicate are ' +
      'constrained, verified on the real engine.',
  },
}
