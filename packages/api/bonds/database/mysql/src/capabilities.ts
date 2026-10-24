/**
 * MySQL's SQL capability declaration — what this bond can honour from the
 * PostgreSQL-dialect setup library.
 *
 * `@molecule/api-database` defines the contract (`SqlCapabilities`); the same
 * data is mirrored into this package's `mlcl/registry.json` entry so the CLI can
 * preflight a resource selection without a MySQL server.
 *
 * `translateDdlToMysql` is the bond's translation layer. It preserves a foreign
 * key's referential action (an inline `REFERENCES` is hoisted into a table-level
 * `FOREIGN KEY`, action included) and drops a NON-unique index's `WHERE`, which
 * only narrows index coverage. It cannot do the same for a UNIQUE partial index:
 * MySQL has no partial indexes, and rebuilding the index from its column list
 * would enforce uniqueness on rows PostgreSQL allows. The bond therefore REFUSES
 * that construct before it touches the database — see
 * `translateDdlToMysql` and the `unique-partial-index` note below.
 *
 * The supported paths (referential actions, full-index translation) were
 * exercised on a real MySQL 8.4 engine; the refusal is decided before any
 * connection is opened.
 *
 * @module
 */

import type { SqlCapabilities } from '@molecule/api-database'

/**
 * What the MySQL bond supports from PostgreSQL-dialect migrations.
 *
 * `unique-partial-index` is `unsupported` and enforced in the bond: the
 * translator throws {@link UnsupportedSqlFeatureError} before rewriting the
 * statement, so a migration can never run with the constraint silently widened.
 */
export const sqlCapabilities: SqlCapabilities = {
  'fk-referential-action': {
    support: 'native',
    note:
      'The translator hoists an inline REFERENCES into a table-level FOREIGN KEY and ' +
      'keeps ON DELETE/ON UPDATE, which InnoDB enforces (CASCADE, SET NULL, RESTRICT, ' +
      'NO ACTION). InnoDB does not implement SET DEFAULT.',
  },
  'partial-index': {
    support: 'translated',
    note:
      'MySQL has no partial indexes; the bond applies a full index on the same columns. ' +
      'The WHERE clause only narrows which rows the index covers, so query results are ' +
      'unchanged.',
  },
  'unique-partial-index': {
    support: 'unsupported',
    note:
      'MySQL has no partial indexes, and rebuilding this UNIQUE index from its column ' +
      'list would forbid rows PostgreSQL allows (for example a second non-default ' +
      'payment method). The bond refuses this construct before running the migration; ' +
      'select PostgreSQL, PGlite or SQLite, or remove the resource whose schema needs it.',
  },
}
