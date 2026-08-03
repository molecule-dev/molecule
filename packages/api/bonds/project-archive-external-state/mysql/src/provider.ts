/**
 * The MySQL external-state provider: dump a project's databases into the
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
import type { MysqlExternalStateConfig } from './types.js'

/** Recorded on every record this provider produces; routes restores back here. */
export const KIND = 'mysql'

/** Artifact path prefix for the dumps. */
const PART_PREFIX = 'database/mysql/'

/** A parsed connection: argv-safe options, with the password kept in the env. */
interface Connection {
  database: string
  args: string[]
  env: NodeJS.ProcessEnv
}

/**
 * Split a connection URL into a database name, client options and environment.
 *
 * The password goes in `MYSQL_PWD`, never in argv — `--password=` is readable by
 * any process on the host, and the MySQL client warns about exactly this.
 *
 * @param url - A `mysql://…` connection URL.
 * @returns The database name, the shared client arguments, and the environment.
 * @throws {Error} If the URL is unparseable or names no database.
 */
export function parseConnection(url: string): Connection {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch (error) {
    throw new Error('a MySQL connection URL could not be parsed', { cause: error })
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
  if (database === '') {
    throw new Error('a MySQL connection URL names no database')
  }
  const args: string[] = []
  if (parsed.hostname) args.push(`--host=${decodeURIComponent(parsed.hostname)}`)
  if (parsed.port) args.push(`--port=${parsed.port}`)
  if (parsed.username) args.push(`--user=${decodeURIComponent(parsed.username)}`)
  const env: NodeJS.ProcessEnv = {}
  if (parsed.password) env.MYSQL_PWD = decodeURIComponent(parsed.password)
  return { database, args, env }
}

/**
 * Read the configured URLs and check the config actually answered.
 *
 * Anything that is not an array of non-empty strings is a deployment bug, and
 * reading it as "this project owns no database" would destroy a live one.
 *
 * @param config - The provider config.
 * @param projectId - The project.
 * @returns The validated URLs.
 * @throws {Error} If the resolver returned anything else.
 */
async function resolveUrls(config: MysqlExternalStateConfig, projectId: string): Promise<string[]> {
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
  return `${PART_PREFIX}${encodeURIComponent(database)}.sql`
}

/**
 * Create the provider.
 *
 * @param config - How to find a project's databases.
 * @returns A provider ready to bond with `setExternalStateProvider`.
 */
export function createMysqlExternalStateProvider(
  config: MysqlExternalStateConfig,
): ProjectExternalStateProvider {
  return {
    kind: KIND,

    async capture(input: ProjectExternalStateCaptureInput): Promise<ProjectExternalStateCapture> {
      const urls = await resolveUrls(config, input.projectId)
      const parts: ArchivePart[] = []
      const records: ProjectExternalStateCapture['records'] = []

      for (const url of urls) {
        const { database, args, env } = parseConnection(url)
        const dumpPath = join(input.workDir, `${encodeURIComponent(database)}.sql`)
        const bytes = await dumpToFile(
          'mysqldump',
          [
            ...args,
            // A consistent snapshot on InnoDB without locking the whole server.
            '--single-transaction',
            // NONE of these are included by default, and their absence is silent —
            // a restored database would simply be missing its stored logic.
            '--routines',
            '--triggers',
            '--events',
            // Requires PROCESS privilege and is meaningless for a per-project dump.
            '--no-tablespaces',
            // `--` so a database name can never be read as a flag: `-A` would
            // otherwise mean --all-databases and dump every tenant into one archive.
            '--',
            database,
          ],
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
        const { database, args, env } = parseConnection(url)
        await restoreFromFile('mysql', [...args, '--', database], input.partPath(record.part), env)
      }
    },
  }
}
