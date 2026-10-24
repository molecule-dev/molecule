/**
 * DuckDB's SQL capability declaration — what the bond can and cannot reproduce
 * from the PostgreSQL-dialect setup library.
 *
 * `@molecule/api-database` defines the contract (`SqlCapabilities`); the same
 * data is mirrored into this package's `mlcl/registry.json` entry so the CLI can
 * run the preflight without installing the bond. Verified against
 * `@duckdb/node-api` 2.0.0-r.1 (the real engine, not a doc page):
 *
 * - a foreign key with `ON DELETE CASCADE` / `SET NULL` / `SET DEFAULT` fails at
 *   parse time with `FOREIGN KEY constraints cannot use CASCADE, SET NULL or SET
 *   DEFAULT`, and DuckDB has no triggers, so the action cannot be reproduced;
 * - `CREATE INDEX ... WHERE ...` fails with `Creating partial indexes is not
 *   supported currently`, while a plain (non-unique) index covers every row
 *   without changing results and a UNIQUE partial index is reproducible with a
 *   `CASE WHEN` expression index.
 *
 * @module
 */

import type { SqlCapabilities } from '@molecule/api-database'

/**
 * What the DuckDB bond supports from PostgreSQL-dialect migrations.
 *
 * `fk-referential-action` is deliberately `unsupported`: applying the setup
 * library with the action dropped would make a parent delete fail while child
 * rows exist, where PostgreSQL cascades — a silently changed delete, which this
 * bond refuses rather than reproduces inexactly.
 */
export const sqlCapabilities: SqlCapabilities = {
  'fk-referential-action': {
    support: 'unsupported',
    note:
      'DuckDB rejects ON DELETE and ON UPDATE CASCADE, SET NULL and SET DEFAULT at ' +
      'parse time and has no triggers, so a cascading or nulling delete cannot be ' +
      'reproduced. Select a database provider that enforces referential actions, or ' +
      'remove the resource whose schema needs them.',
  },
  'partial-index': {
    support: 'translated',
    note:
      'Applied as a full index on the same columns. The WHERE clause only narrows ' +
      'which rows the index covers, so query results are identical without it.',
  },
  'unique-partial-index': {
    support: 'translated',
    note:
      'Applied as a UNIQUE index over CASE WHEN <predicate> THEN <column> END for each ' +
      'indexed column. Rows outside the predicate get NULL keys, which DuckDB keeps ' +
      'distinct, so exactly the rows PostgreSQL would constrain are constrained.',
  },
}
