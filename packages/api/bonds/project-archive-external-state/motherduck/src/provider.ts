/**
 * The MotherDuck external-state provider: export a project's hosted databases
 * into the archive, and import them back.
 *
 * @module
 */

import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import type { DuckDBConnection } from '@duckdb/node-api'
import { DuckDBInstance } from '@duckdb/node-api'

import type {
  ArchivePart,
  ProjectExternalStateCapture,
  ProjectExternalStateCaptureInput,
  ProjectExternalStateProvider,
  ProjectExternalStateRecord,
  ProjectExternalStateRestoreInput,
} from '@molecule/api-project-archive'

import type { MotherduckExternalStateConfig } from './types.js'

/** Recorded on every record this provider produces; routes restores back here. */
export const KIND = 'motherduck'

/** Artifact path prefix for the exports. */
const PART_PREFIX = 'database/motherduck/'

/** Where the token comes from by default. */
const DEFAULT_TOKEN_ENV = 'MOTHERDUCK_TOKEN'

/** Where to create one, for the error when it is missing. */
const TOKEN_HELP_URL =
  'https://motherduck.com/docs/key-tasks/authenticating-and-connecting-to-motherduck/authenticating-to-motherduck'

/**
 * Normalize a declared database name: strip a leading `md:` so both
 * `md:my_db` and `my_db` mean the same database.
 *
 * @param name - The declared name.
 * @returns The bare database name.
 */
function bareName(name: string): string {
  return name.replace(/^md:/i, '')
}

/**
 * Read the configured names and check the config actually answered.
 *
 * @param config - The provider config.
 * @param projectId - The project.
 * @returns The validated, bare database names.
 * @throws {Error} If the resolver returned anything but an array of names.
 */
async function resolveDatabases(
  config: MotherduckExternalStateConfig,
  projectId: string,
): Promise<string[]> {
  const names = await config.databases(projectId)
  if (!Array.isArray(names) || names.some((name) => typeof name !== 'string' || name === '')) {
    throw new Error(
      `databases(${JSON.stringify(projectId)}) must return an array of database names; ` +
        `it returned ${Object.prototype.toString.call(names)}. Refusing to read that as ` +
        `"this project owns no database" — the caller destroys the project on a successful capture.`,
    )
  }
  return names.map(bareName)
}

/**
 * Resolve the token from config or the env var, lazily.
 *
 * @param config - The provider config.
 * @returns The token.
 * @throws {Error} When no token is set — with where to create one.
 */
function resolveToken(config: MotherduckExternalStateConfig): string {
  if (config.token) return config.token
  const token = process.env[config.tokenEnv ?? DEFAULT_TOKEN_ENV]
  if (!token) {
    throw new Error(
      `${config.tokenEnv ?? DEFAULT_TOKEN_ENV} is not set — a MotherDuck capture/export cannot ` +
        `run. Create a token at ${TOKEN_HELP_URL} (UI: Settings → "+ Create token") and pass it ` +
        `or set the env var.`,
    )
  }
  return token
}

/**
 * Open (or join) a cached `md:` connection — `fromCache` is mandatory per
 * MotherDuck's docs: the Node client does not cache instances by default and
 * every bare `create()` re-fetches the remote catalog.
 *
 * @param database - The bare database name, or `''` for the account default.
 * @param token - The MotherDuck token.
 * @param config - The provider config.
 * @returns A connected DuckDB connection.
 */
async function connect(
  database: string,
  token: string,
  config: MotherduckExternalStateConfig,
): Promise<DuckDBConnection> {
  const instance = await DuckDBInstance.fromCache(database ? `md:${database}` : 'md:', {
    motherduck_token: token,
    ...(config.config ?? {}),
  })
  return instance.connect()
}

/**
 * Every file under `dir`, as POSIX-ish relative paths.
 *
 * @param dir - The directory to walk.
 * @returns Relative paths of the files it holds.
 */
async function filesUnder(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      for (const nested of await filesUnder(join(dir, entry.name))) {
        out.push(`${entry.name}/${nested}`)
      }
    } else {
      out.push(entry.name)
    }
  }
  return out
}

/**
 * Create the provider.
 *
 * @param config - How to find a project's databases and reach MotherDuck.
 * @returns A provider ready to bond with `setExternalStateProvider`.
 */
export function createMotherduckExternalStateProvider(
  config: MotherduckExternalStateConfig,
): ProjectExternalStateProvider {
  return {
    kind: KIND,

    async capture(input: ProjectExternalStateCaptureInput): Promise<ProjectExternalStateCapture> {
      const databases = await resolveDatabases(config, input.projectId)
      const token = resolveToken(config)

      const parts: ArchivePart[] = []
      const records: ProjectExternalStateRecord[] = []

      for (const database of databases) {
        const exportDir = join(input.workDir, 'motherduck', database)
        const connection = await connect(database, token, config)
        try {
          // DuckDB's own `EXPORT DATABASE`, parquet format — the client
          // materializes the remote database locally as schema.sql, load.sql
          // and one parquet file per table. A database that does not exist in
          // the account FAILS here, which is exactly the refusal a wrong
          // configured name deserves.
          await connection.run(
            `EXPORT DATABASE '${exportDir.replace(/'/g, "''")}' (FORMAT PARQUET)`,
          )
        } finally {
          connection.disconnectSync()
        }
        for (const file of (await filesUnder(exportDir)).sort()) {
          const content = new Uint8Array(await readFile(join(exportDir, file)))
          const path = `${PART_PREFIX}${encodeURIComponent(database)}/${file}`
          parts.push({
            path,
            content,
            kind: 'database',
            meta: { engine: KIND, database, file },
          })
          records.push({ kind: KIND, id: `${database}:${file}`, part: path, detail: { database } })
        }
      }

      return { parts, records }
    },

    async restore(input: ProjectExternalStateRestoreInput): Promise<void> {
      const databases = await resolveDatabases(config, input.projectId)
      const token = resolveToken(config)

      // The files each database's export produced, grouped by database.
      const grouped = new Map<string, { file: string; part: string }[]>()
      for (const record of input.records) {
        const database = String(record.detail?.database ?? '')
        if (!database || !databases.includes(database)) {
          throw new Error(
            `the archive holds the MotherDuck database ${database || '(unnamed)'}, but ` +
              `databases(${JSON.stringify(input.projectId)}) does not name it. Refusing to ` +
              `report the project restored while one of its databases has nowhere to go.`,
          )
        }
        if (!record.part) {
          throw new Error(
            `the archive records MotherDuck database ${database} file ${record.id} with no copy to restore from`,
          )
        }
        const file = record.id.slice(database.length + 1)
        const bucket = grouped.get(database) ?? []
        bucket.push({ file, part: record.part })
        grouped.set(database, bucket)
      }

      for (const [database, files] of grouped) {
        // Rebuild the export directory layout `IMPORT DATABASE` expects, in a
        // scratch directory of our own (restore input carries none).
        const importDir = await mkdtemp(join(tmpdir(), `mol-motherduck-${database}-`))
        try {
          for (const { file, part } of files) {
            const content = await readFile(input.partPath(part))
            await mkdir(join(importDir, dirname(file)), { recursive: true })
            await writeFile(join(importDir, file), content)
          }
          // `CREATE DATABASE IF NOT EXISTS` and `USE` are MotherDuck statements
          // (verified against MotherDuck's SQL reference); `IMPORT DATABASE` is
          // core DuckDB and loads schema.sql + load.sql + the parquet files into
          // the CURRENT database.
          const connection = await connect('', token, config)
          try {
            const name = database.replace(/"/g, '""')
            await connection.run(
              `CREATE DATABASE IF NOT EXISTS "${name}"; USE "${name}"; ` +
                `IMPORT DATABASE '${importDir.replace(/'/g, "''")}'`,
            )
          } finally {
            connection.disconnectSync()
          }
        } finally {
          await rm(importDir, { recursive: true, force: true })
        }
      }
    },
  }
}
