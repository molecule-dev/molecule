/**
 * PGlite's SQL capability declaration — what this bond can honour from the
 * PostgreSQL-dialect setup library.
 *
 * `@molecule/api-database` defines the contract (`SqlCapabilities`); the same
 * data is mirrored into this package's `mlcl/registry.json` entry so the CLI can
 * preflight a resource selection without starting a WebAssembly database.
 *
 * PGlite is PostgreSQL compiled to WebAssembly, and this bond's migrator runs
 * each setup file as written, so every construct in this contract is applied
 * natively. The claims were exercised on the real PGlite engine (the package's
 * own `@electric-sql/pglite` dependency) in the candidate's engine controls.
 *
 * @module
 */

import type { SqlCapabilities } from '@molecule/api-database'

/**
 * What the PGlite bond supports from PostgreSQL-dialect migrations.
 *
 * All three features are `native`: the engine is PostgreSQL and the bond adds no
 * translation that could change their behaviour.
 */
export const sqlCapabilities: SqlCapabilities = {
  'fk-referential-action': {
    support: 'native',
    note:
      'PGlite is PostgreSQL compiled to WebAssembly; the bond applies the statement ' +
      'as written and the engine enforces the action.',
  },
  'partial-index': {
    support: 'native',
    note: 'PGlite is PostgreSQL and supports partial indexes; the statement is applied as written.',
  },
  'unique-partial-index': {
    support: 'native',
    note:
      'PGlite is PostgreSQL and supports UNIQUE partial indexes; the statement is applied ' +
      'as written, so only rows matching the predicate are constrained.',
  },
}
