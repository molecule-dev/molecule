/**
 * The PostgreSQL external-state provider: dump a project's databases into the
 * archive, and load them back.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type {
  ArchivePart,
  ProjectExternalStateCapture,
  ProjectExternalStateCaptureInput,
  ProjectExternalStateProvider,
  ProjectExternalStateRestoreInput,
} from '@molecule/api-project-archive'

import { dumpToFile, restoreFromFile } from './dump.js'
import type { PostgresqlExternalStateConfig } from './types.js'

/** Recorded on every record this provider produces; routes restores back here. */
export const KIND = 'postgresql'

/** Artifact path prefix for the dumps. */
const PART_PREFIX = 'database/postgresql/'

/** A parsed connection: what the tools need, with the password kept out of argv. */
interface Connection {
  database: string
  env: NodeJS.ProcessEnv
}

/**
 * Split a connection URL into a database name and the libpq environment.
 *
 * Credentials go in the ENVIRONMENT, never in argv — argv is readable by any
 * process on the host.
 *
 * @param url - A `postgres://…` connection URL.
 * @returns The database name and the environment for the tools.
 * @throws {Error} If the URL is unparseable or names no database.
 */
export function parseConnection(url: string): Connection {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch (error) {
    throw new Error('a PostgreSQL connection URL could not be parsed', { cause: error })
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  if (database === '') {
    throw new Error('a PostgreSQL connection URL names no database')
  }
  const env: NodeJS.ProcessEnv = { PGDATABASE: database }
  if (parsed.hostname) env.PGHOST = decodeURIComponent(parsed.hostname)
  if (parsed.port) env.PGPORT = parsed.port
  if (parsed.username) env.PGUSER = decodeURIComponent(parsed.username)
  if (parsed.password) env.PGPASSWORD = decodeURIComponent(parsed.password)
  return { database, env }
}

/**
 * Read the configured URLs and check the config actually answered.
 *
 * A resolver that returns `''`, a `Set`, a `Map`, `undefined` — anything that is
 * not an array of non-empty strings — is a BUG in the deployment, and treating it
 * as "this project owns no database" would destroy a live one. Only a real,
 * empty array declares absence.
 *
 * @param config - The provider config.
 * @param projectId - The project.
 * @returns The validated URLs.
 * @throws {Error} If the resolver returned anything else.
 */
async function resolveUrls(
  config: PostgresqlExternalStateConfig,
  projectId: string,
): Promise<string[]> {
  const urls = await config.databaseUrls(projectId)
  if (!Array.isArray(urls) || urls.some((url) => typeof url !== 'string' || url === '')) {
    throw new Error(
      `databaseUrls(${JSON.stringify(projectId)}) must return an array of connection URLs; ` +
        `it returned ${Object.prototype.toString.call(urls)}. Refusing to read that as ` +
        `"this project owns no database" — the caller destroys the project on a successful capture.`,
    )
  }
  return [...urls]
}

/** Artifact part path for one database. */
function partPathFor(database: string): string {
  return `${PART_PREFIX}${encodeURIComponent(database)}.dump`
}

/**
 * Create the provider.
 *
 * @param config - How to find a project's databases.
 * @returns A provider ready to bond with `setExternalStateProvider`.
 */
export function createPostgresqlExternalStateProvider(
  config: PostgresqlExternalStateConfig,
): ProjectExternalStateProvider {
  return {
    kind: KIND,

    async capture(input: ProjectExternalStateCaptureInput): Promise<ProjectExternalStateCapture> {
      const urls = await resolveUrls(config, input.projectId)
      const parts: ArchivePart[] = []
      const records: ProjectExternalStateCapture['records'] = []

      for (const url of urls) {
        const { database, env } = parseConnection(url)
        const dumpPath = join(input.workDir, `${encodeURIComponent(database)}.dump`)
        // `--` so a database name can never be read as a flag.
        const bytes = await dumpToFile(
          'pg_dump',
          ['--format=custom', '--no-owner', '--no-privileges', '--', database],
          dumpPath,
          env,
        )
        const content = new Uint8Array(await readFile(dumpPath))
        if (content.byteLength !== bytes) {
          throw new Error(
            `the dump of ${database} is ${content.byteLength} bytes on disk but ${bytes} were ` +
              `streamed. Refusing to archive a file that changed under us.`,
          )
        }
        const path = partPathFor(database)
        parts.push({ path, content, kind: 'database', meta: { engine: KIND, database } })
        records.push({ kind: KIND, id: database, part: path })
      }

      return { parts, records }
    },

    async restore(input: ProjectExternalStateRestoreInput): Promise<void> {
      const urls = await resolveUrls(config, input.projectId)
      const byDatabase = new Map(urls.map((url) => [parseConnection(url).database, url]))

      for (const record of input.records) {
        if (!record.part) {
          throw new Error(`the archive records database ${record.id} with no dump to restore from`)
        }
        const url = byDatabase.get(record.id)
        if (!url) {
          throw new Error(
            `the archive holds database ${record.id}, but databaseUrls(${JSON.stringify(input.projectId)}) ` +
              `does not name it. Refusing to report the project restored while one of its ` +
              `databases has nowhere to go.`,
          )
        }
        const { database, env } = parseConnection(url)
        await restoreFromFile(
          'pg_restore',
          ['--clean', '--if-exists', '--no-owner', '--no-privileges', '--dbname', database],
          input.partPath(record.part),
          env,
        )
      }
    },
  }
}
