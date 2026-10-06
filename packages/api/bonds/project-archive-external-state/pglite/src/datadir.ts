/**
 * Dump, load and fingerprint PGlite data directories.
 *
 * Every database is reached through `@molecule/api-database-pglite`'s own
 * instance registry (`acquireInstance` / `releaseInstance`), never through a
 * `new PGlite()` of our own. Two PGlite instances on one folder both open
 * without complaint and then overwrite each other's files, so the only safe way
 * to read a folder the app's pool may already have open is to JOIN that
 * instance — and to take its connection lock, so a dump never lands in the
 * middle of somebody's transaction.
 *
 * @module
 */

import { createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { gunzip } from 'node:zlib'

import {
  acquireInstance,
  MEMORY_DATA_DIR,
  type PgliteInstance,
  releaseInstance,
} from '@molecule/api-database-pglite'

const gunzipAsync = promisify(gunzip)

/**
 * Row count per user table, keyed `"schema"."table"`, plus the current value of
 * every user sequence, keyed `sequence "schema"."name"` — all as decimal strings.
 */
export type TableCounts = Record<string, string>

/** What one dump produced. */
export interface DataDirDump {
  /** The gzip-compressed tar PGlite's `dumpDataDir('gzip')` returned. */
  bytes: Uint8Array
  /** Row counts read under the same lock, immediately before the dump. */
  tables: TableCounts
  /** `server_version` of the instance that wrote the dump. */
  postgresVersion: string
}

/**
 * Hex SHA-256 of some bytes.
 *
 * @param bytes - The bytes to hash.
 * @returns The lowercase hex digest.
 */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/**
 * Quote a Postgres identifier.
 *
 * @param name - The raw identifier.
 * @returns The identifier in double quotes, inner quotes doubled.
 */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

/**
 * Count the rows of every user table and read every user sequence (everything
 * outside the system schemas), in a stable order.
 *
 * @param instance - An open instance whose connection the caller holds.
 * @returns Row counts keyed by quoted `schema.table`.
 */
export async function countTables(instance: PgliteInstance): Promise<TableCounts> {
  const { rows } = await instance.db.query<{ schema: string; name: string; kind: string }>(
    `SELECT n.nspname AS schema, c.relname AS name, c.relkind::text AS kind
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'S')
        AND n.nspname <> 'information_schema'
        AND n.nspname NOT LIKE 'pg\\_%'
      ORDER BY 1, 2`,
  )
  const counts: TableCounts = {}
  for (const { schema, name, kind } of rows) {
    const rel = `${quoteIdent(schema)}.${quoteIdent(name)}`
    if (kind === 'S') {
      const result = await instance.db.query<{ n: string }>(
        `SELECT CASE WHEN is_called THEN last_value::text ELSE 'unused' END AS n FROM ${rel}`,
      )
      counts[`sequence ${rel}`] = result.rows[0]?.n ?? 'unknown'
    } else {
      const result = await instance.db.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM ${rel}`,
      )
      counts[rel] = result.rows[0]?.n ?? '0'
    }
  }
  return counts
}

/**
 * Canonical string form of a set of table counts, for comparison.
 *
 * @param counts - The counts.
 * @returns A string that is equal for equal count sets regardless of key order.
 */
export function canonicalCounts(counts: TableCounts): string {
  return JSON.stringify(Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
}

/**
 * Dump one data directory through the app's shared instance.
 *
 * Joins (or opens) the instance for `dataDir` in the database bond's registry,
 * waits for its single connection, and reads the row counts and the dump while
 * holding it — so nothing commits between the two and no transaction is open
 * during the dump.
 *
 * @param dataDir - Absolute path of an existing PGlite data directory.
 * @param timeoutMillis - How long to wait for the connection.
 * @returns The dump and what it should contain.
 * @throws {Error} If the connection cannot be had in time or the dump fails.
 */
export async function dumpDataDir(dataDir: string, timeoutMillis: number): Promise<DataDirDump> {
  const instance = await acquireInstance({ dataDir, acquireTimeoutMillis: timeoutMillis })
  try {
    let release: () => void
    try {
      release = await instance.lock.acquire('project-archive capture', timeoutMillis)
    } catch (error) {
      throw new Error(
        `could not get the connection to the PGlite database at ${dataDir} within ` +
          `${timeoutMillis} ms to capture it`,
        { cause: error },
      )
    }
    try {
      const version = await instance.db.query<{ v: string }>(
        `SELECT current_setting('server_version') AS v`,
      )
      const tables = await countTables(instance)
      // Without a checkpoint the dump is a crash image: loading it replays WAL,
      // and Postgres's sequence pre-logging moves every sequence up to 32 ahead
      // (measured on PGlite 0.5.8). A checkpoint first makes the files exact.
      await instance.db.exec('CHECKPOINT')
      const blob = await instance.db.dumpDataDir('gzip')
      const bytes = new Uint8Array(await blob.arrayBuffer())
      if (bytes.byteLength === 0) {
        throw new Error(`PGlite produced an empty dump of ${dataDir}`)
      }
      return { bytes, tables, postgresVersion: version.rows[0]?.v ?? 'unknown' }
    } finally {
      release()
    }
  } finally {
    await releaseInstance(instance)
  }
}

/**
 * Decompress a dump into the tar PGlite's `loadDataDir` takes.
 *
 * Done here with node's zlib rather than by PGlite: PGlite 0.5.8 inflates a
 * gzip dump on a web stream whose failure is not tied to any promise, so a
 * truncated gzip crashes the whole process instead of rejecting. Handing it a
 * plain tar that zlib has already validated avoids that path entirely.
 *
 * @param gz - The gzip bytes.
 * @param maxBytes - Largest uncompressed size accepted.
 * @returns The uncompressed tar.
 * @throws {Error} If the bytes are not valid gzip or inflate past `maxBytes`.
 */
export async function inflateDump(
  gz: Uint8Array,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  try {
    return new Uint8Array(await gunzipAsync(gz, { maxOutputLength: maxBytes }))
  } catch (error) {
    throw new Error(`the PGlite dump is not a valid gzip stream of at most ${maxBytes} bytes`, {
      cause: error,
    })
  }
}

/**
 * Load a tar into a fresh in-memory instance and count its rows — proof that a
 * dump loads and holds what was counted when it was taken.
 *
 * @param tar - The uncompressed data-directory tar.
 * @returns The row counts of the loaded database.
 */
export async function countLoadedDump(tar: Uint8Array<ArrayBuffer>): Promise<TableCounts> {
  const instance = await acquireInstance({
    dataDir: MEMORY_DATA_DIR,
    pgliteOptions: { loadDataDir: new Blob([tar]) },
  })
  try {
    return await countTables(instance)
  } finally {
    await releaseInstance(instance)
  }
}

/** Outcome of loading a tar into a folder. */
export interface LoadOutcome {
  /** Row counts of the loaded database. */
  tables: TableCounts
}

/**
 * Load a tar into an empty folder, through the database bond's registry, and
 * count what landed.
 *
 * @param dataDir - Absolute path of the (empty or absent) target folder.
 * @param tar - The uncompressed data-directory tar.
 * @param timeoutMillis - How long to wait for the connection.
 * @returns The counts of the loaded database.
 * @throws {Error} If the folder was opened by another pool in this process
 *   meanwhile (the load would have been ignored), or the load fails.
 */
export async function loadDataDir(
  dataDir: string,
  tar: Uint8Array<ArrayBuffer>,
  timeoutMillis: number,
): Promise<LoadOutcome> {
  const instance = await acquireInstance({
    dataDir,
    acquireTimeoutMillis: timeoutMillis,
    pgliteOptions: { loadDataDir: new Blob([tar]) },
  })
  try {
    if (instance.refs > 1) {
      throw new JoinedInstanceError(dataDir)
    }
    const release = await instance.lock.acquire('project-archive restore', timeoutMillis)
    try {
      return { tables: await countTables(instance) }
    } finally {
      release()
    }
  } finally {
    await releaseInstance(instance)
  }
}

/**
 * Raised when a restore target turned out to be open in another pool of this
 * process — the load was ignored and the folder belongs to someone else, so it
 * must not be cleaned up.
 */
export class JoinedInstanceError extends Error {
  /**
   * Build the error for a folder another pool holds.
   *
   * @param dataDir - The folder another pool holds.
   */
  constructor(dataDir: string) {
    super(
      `the PGlite data directory ${dataDir} is already open in this process, so the archived ` +
        `database cannot be loaded into it. End the pools using it and restore again.`,
    )
    this.name = 'JoinedInstanceError'
  }
}
