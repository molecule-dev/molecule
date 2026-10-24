/**
 * MotherDuck's SQL capability declaration.
 *
 * MotherDuck runs DuckDB in the cloud, so the capability map is the DuckDB
 * bond's, re-exported through a value (not a comment) so the two cannot drift.
 * `@molecule/api-database` defines the contract (`SqlCapabilities`); the same
 * data is mirrored into this package's `mlcl/registry.json` entry so the CLI can
 * preflight a resource selection without connecting to MotherDuck.
 *
 * @module
 */

import type { SqlCapabilities } from '@molecule/api-database'
import { sqlCapabilities as duckdbSqlCapabilities } from '@molecule/api-database-duckdb/capabilities.js'

/**
 * What the MotherDuck bond supports from PostgreSQL-dialect migrations.
 *
 * Identical to the DuckDB bond: the engine is the same, so a referential action
 * (`ON DELETE`/`ON UPDATE` `CASCADE`, `SET NULL`, `SET DEFAULT`) is unsupported
 * and partial indexes are translated without changing behaviour.
 */
export const sqlCapabilities: SqlCapabilities = duckdbSqlCapabilities
