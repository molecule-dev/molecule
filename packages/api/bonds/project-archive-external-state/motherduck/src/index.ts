/**
 * Capture and restore a project's MotherDuck databases for
 * `@molecule/api-project-archive`.
 *
 * It runs DuckDB's `EXPORT DATABASE` (parquet format) through
 * `@duckdb/node-api` for each configured database and packs the exported
 * files into the archive; restore recreates the database with MotherDuck's
 * `CREATE DATABASE IF NOT EXISTS` + `USE` and DuckDB's `IMPORT DATABASE`.
 *
 * @example
 * ```typescript
 * import { setExternalStateProvider } from '@molecule/api-project-archive'
 * import { createMotherduckExternalStateProvider } from '@molecule/api-project-archive-external-state-motherduck'
 *
 * setExternalStateProvider(
 *   createMotherduckExternalStateProvider({
 *     databases: (projectId) => [`app_${projectId.replace(/-/g, '_')}`],
 *   }),
 * )
 * ```
 *
 * @remarks
 * **State in MotherDuck is not in the project's source tree**, so a project
 * that owns a `md:` database needs this provider (or an explicit exemption)
 * — without it the archive verifies clean while the data is destroyed.
 *
 * **A configured database that does not exist FAILS the capture** — the export
 * cannot run against it — rather than being read as "this project owns none".
 * Only an empty `databases` result declares that a project owns no database.
 *
 * **The token is required** (`MOTHERDUCK_TOKEN` env var, or `token` in the
 * config) and is read at capture/restore time, never at import time. Create
 * one in the MotherDuck UI under Settings → "+ Create token".
 *
 * **Exports materialize locally.** `EXPORT DATABASE` writes every table's
 * parquet to the capture's scratch directory before it is packed, so the host
 * needs disk for the database's full size. The exports are schema + data, not
 * a zero-copy clone; MotherDuck's `CREATE DATABASE … FROM` snapshot cloning is
 * the lighter in-account option when the archive does not need the bytes.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
