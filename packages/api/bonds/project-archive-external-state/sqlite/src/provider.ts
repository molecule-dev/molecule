/**
 * The SQLite external-state provider: dump a project's database files into the
 * archive, and load them back.
 *
 * @module
 */

import { readFile, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'

import type {
  ArchivePart,
  ProjectExternalStateCapture,
  ProjectExternalStateCaptureInput,
  ProjectExternalStateProvider,
  ProjectExternalStateRestoreInput,
} from '@molecule/api-project-archive'

import { dumpToFile, restoreFromFile } from './dump.js'
import type { SqliteExternalStateConfig } from './types.js'

/** Recorded on every record this provider produces; routes restores back here. */
export const KIND = 'sqlite'

/** Artifact path prefix for the dumps. */
const PART_PREFIX = 'database/sqlite/'

/**
 * Read the configured paths and check the config actually answered.
 *
 * @param config - The provider config.
 * @param projectId - The project.
 * @returns The validated paths.
 * @throws {Error} If the resolver returned anything but an array of paths.
 */
async function resolvePaths(
  config: SqliteExternalStateConfig,
  projectId: string,
): Promise<string[]> {
  const paths = await config.databasePaths(projectId)
  if (!Array.isArray(paths) || paths.some((path) => typeof path !== 'string' || path === '')) {
    throw new Error(
      `databasePaths(${JSON.stringify(projectId)}) must return an array of file paths; ` +
        `it returned ${Object.prototype.toString.call(paths)}. Refusing to read that as ` +
        `"this project owns no database" — the caller destroys the project on a successful capture.`,
    )
  }
  return [...paths]
}

/** Artifact part path for one database file. */
function partPathFor(sourcePath: string): string {
  return `${PART_PREFIX}${encodeURIComponent(sourcePath)}.sql`
}

/**
 * Create the provider.
 *
 * @param config - How to find a project's database files.
 * @returns A provider ready to bond with `setExternalStateProvider`.
 */
export function createSqliteExternalStateProvider(
  config: SqliteExternalStateConfig,
): ProjectExternalStateProvider {
  return {
    kind: KIND,

    async capture(input: ProjectExternalStateCaptureInput): Promise<ProjectExternalStateCapture> {
      const paths = await resolvePaths(config, input.projectId)

      // Check EVERY path before dumping ANY of them. A configured path that is
      // not there is a FAILURE — it cannot be read as "this project has no
      // database", because the config already said it does. Checking up front
      // also means a missing fifth database is caught before four dumps have been
      // written, so a misconfiguration never produces a partial capture.
      for (const sourcePath of paths) {
        try {
          await stat(sourcePath)
        } catch (error) {
          throw new Error(
            `databasePaths named ${sourcePath} for project ${input.projectId}, but there is no ` +
              `file there. Refusing to treat a missing configured database as an absent one.`,
            { cause: error },
          )
        }
      }

      const parts: ArchivePart[] = []
      const records: ProjectExternalStateCapture['records'] = []

      for (const sourcePath of paths) {
        const dumpPath = join(input.workDir, `${encodeURIComponent(basename(sourcePath))}.sql`)
        // `.dump` runs inside a transaction, so it is a CONSISTENT read of a live
        // database — unlike copying the file, which can catch a checkpoint
        // mid-write or a `-wal`/`-shm` pair that does not match the main file.
        // It also emits portable SQL, so a restore does not depend on the page
        // format of the SQLite build that wrote it.
        const bytes = await dumpToFile('sqlite3', ['--', sourcePath, '.dump'], dumpPath)
        const content = new Uint8Array(await readFile(dumpPath))
        if (content.byteLength !== bytes) {
          throw new Error(
            `the dump of ${sourcePath} is ${content.byteLength} bytes on disk but ${bytes} were ` +
              `streamed. Refusing to archive a file that changed under us.`,
          )
        }
        const path = partPathFor(sourcePath)
        parts.push({ path, content, kind: 'database', meta: { engine: KIND, source: sourcePath } })
        records.push({ kind: KIND, id: sourcePath, part: path })
      }

      return { parts, records }
    },

    async restore(input: ProjectExternalStateRestoreInput): Promise<void> {
      const paths = new Set(await resolvePaths(config, input.projectId))

      for (const record of input.records) {
        if (!record.part) {
          throw new Error(`the archive records database ${record.id} with no dump to restore from`)
        }
        if (!paths.has(record.id)) {
          throw new Error(
            `the archive holds the database ${record.id}, but databasePaths(${JSON.stringify(input.projectId)}) ` +
              `does not name it. Refusing to report the project restored while one of its ` +
              `databases has nowhere to go.`,
          )
        }
        await restoreFromFile('sqlite3', ['--', record.id], input.partPath(record.part))
      }
    },
  }
}
