/**
 * PostgreSQL's SQL capability declaration — what this bond can honour from the
 * PostgreSQL-dialect setup library.
 *
 * `@molecule/api-database` defines the contract (`SqlCapabilities`); the same
 * data is mirrored into this package's `mlcl/registry.json` entry so the CLI can
 * preflight a resource selection without installing the bond.
 *
 * PostgreSQL is the DIALECT the setup library is authored in, and this bond's
 * migrator runs each file as written (`client.query(readFileSync(...))`), so
 * every construct in this contract is applied natively. The claims were
 * exercised on a real PostgreSQL 16 engine in the candidate's engine controls.
 *
 * @module
 */

import type { SqlCapabilities } from '@molecule/api-database'

/**
 * What the PostgreSQL bond supports from PostgreSQL-dialect migrations.
 *
 * All three features are `native`: the engine defines their behaviour and the
 * bond adds no translation that could change it.
 */
export const sqlCapabilities: SqlCapabilities = {
  'fk-referential-action': {
    support: 'native',
    note:
      'PostgreSQL is the dialect this setup library is authored in; the bond applies ' +
      'the statement as written and the engine enforces the action.',
  },
  'partial-index': {
    support: 'native',
    note: 'PostgreSQL supports partial indexes; the bond applies the statement as written.',
  },
  'unique-partial-index': {
    support: 'native',
    note:
      'PostgreSQL supports UNIQUE partial indexes; the bond applies the statement as ' +
      'written, so only rows matching the predicate are constrained.',
  },
}
