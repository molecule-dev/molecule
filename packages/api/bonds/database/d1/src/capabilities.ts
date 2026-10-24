/**
 * Cloudflare D1's SQL capability declaration — what this provider can honour
 * from the PostgreSQL-dialect setup library.
 *
 * `@molecule/api-database` defines the contract (`SqlCapabilities`); the same
 * data is mirrored into this package's `mlcl/registry.json` entry so the CLI can
 * preflight a resource selection without a Cloudflare account.
 *
 * D1 is SQLite, so the support values are the SQLite bond's. This package keeps
 * its OWN declaration (rather than re-exporting the sqlite constant) because the
 * notes must be true for this provider: D1 has no migration runner — schema is
 * applied out of band with `wrangler d1 migrations apply` — so the bond does not
 * set `PRAGMA foreign_keys` itself. The support values are pinned to the SQLite
 * bond's by a test, so the two cannot drift.
 *
 * The SQLite engine behaviour behind these values was exercised on the real
 * engine (`better-sqlite3`); the hosted D1 service itself was not contacted by
 * this candidate.
 *
 * @module
 */

import type { SqlCapabilities } from '@molecule/api-database'

/**
 * What the Cloudflare D1 provider supports from PostgreSQL-dialect migrations.
 *
 * The support values match the SQLite bond's; the notes say what is true for
 * D1's out-of-band migration path.
 */
export const sqlCapabilities: SqlCapabilities = {
  'fk-referential-action': {
    support: 'native',
    note:
      'D1 runs SQLite, whose engine enforces the action; D1 schema is applied out of ' +
      'band with `wrangler d1 migrations apply`, so the bond itself sets no pragma.',
  },
  'partial-index': {
    support: 'native',
    note: 'D1 runs SQLite and supports partial indexes; the statement applies as written.',
  },
  'unique-partial-index': {
    support: 'native',
    note:
      'D1 runs SQLite and supports UNIQUE partial indexes; only rows matching the ' +
      'predicate are constrained.',
  },
}
