/**
 * The DuckDB external-state provider: copy a project's database files into the
 * archive, and write them back.
 *
 * @module
 */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type {
  ArchivePart,
  ProjectExternalStateCapture,
  ProjectExternalStateCaptureInput,
  ProjectExternalStateProvider,
  ProjectExternalStateRestoreInput,
} from '@molecule/api-project-archive'

import type { DuckdbExternalStateConfig } from './types.js'

/** Recorded on every record this provider produces; routes restores back here. */
export const KIND = 'duckdb'

/** Artifact path prefix for the copies. */
const PART_PREFIX = 'database/duckdb/'

/** The write-ahead-log sibling of a database file, replayed by DuckDB on open. */
const WAL_SUFFIX = '.wal'

/**
 * Read the configured paths and check the config actually answered.
 *
 * @param config - The provider config.
 * @param projectId - The project.
 * @returns The validated paths.
 * @throws {Error} If the resolver returned anything but an array of paths.
 */
async function resolvePaths(
  config: DuckdbExternalStateConfig,
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

/** Artifact part path for one file. */
function partPathFor(sourcePath: string): string {
  return `${PART_PREFIX}${encodeURIComponent(sourcePath)}`
}

/**
 * Create the provider.
 *
 * @param config - How to find a project's database files.
 * @returns A provider ready to bond with `setExternalStateProvider`.
 */
export function createDuckdbExternalStateProvider(
  config: DuckdbExternalStateConfig,
): ProjectExternalStateProvider {
  return {
    kind: KIND,

    async capture(input: ProjectExternalStateCaptureInput): Promise<ProjectExternalStateCapture> {
      const paths = await resolvePaths(config, input.projectId)

      // Check EVERY path before copying ANY of them. A configured path that is
      // not there is a FAILURE — it cannot be read as "this project has no
      // database", because the config already said it does. Checking up front
      // also means a missing fifth database is caught before four copies have
      // been written, so a misconfiguration never produces a partial capture.
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
        // A byte copy, not `EXPORT DATABASE`: DuckDB holds a per-process WRITE
        // lock on an open database file, so the archiver CANNOT open a live
        // read-write database at all — the copy is the only whole-file read
        // available. The `.wal` sibling is captured with it: DuckDB replays it
        // on next open, so main+wal together ARE the database's current state.
        // Quiesce the app (or `CHECKPOINT`) before a capture for a tidier copy.
        const content = new Uint8Array(await readFile(sourcePath))
        const path = partPathFor(sourcePath)
        parts.push({ path, content, kind: 'database', meta: { engine: KIND, source: sourcePath } })
        records.push({ kind: KIND, id: sourcePath, part: path })

        try {
          const wal = await readFile(`${sourcePath}${WAL_SUFFIX}`)
          const walPath = partPathFor(`${sourcePath}${WAL_SUFFIX}`)
          parts.push({
            path: walPath,
            content: new Uint8Array(wal),
            kind: 'database',
            meta: { engine: KIND, source: `${sourcePath}${WAL_SUFFIX}` },
          })
          records.push({ kind: KIND, id: `${sourcePath}${WAL_SUFFIX}`, part: walPath })
        } catch (_error) {
          // No WAL sibling: the database was checkpointed on close (the
          // common case for a stopped app) — nothing to capture.
        }
      }

      return { parts, records }
    },

    async restore(input: ProjectExternalStateRestoreInput): Promise<void> {
      const paths = new Set(await resolvePaths(config, input.projectId))
      const expectedWal = new Set([...paths].map((path) => `${path}${WAL_SUFFIX}`))

      for (const record of input.records) {
        if (!record.part) {
          throw new Error(`the archive records database ${record.id} with no copy to restore from`)
        }
        const isMain = paths.has(record.id)
        const isWal = expectedWal.has(record.id)
        if (!isMain && !isWal) {
          throw new Error(
            `the archive holds the database ${record.id}, but databasePaths(${JSON.stringify(input.projectId)}) ` +
              `does not name it. Refusing to report the project restored while one of its ` +
              `databases has nowhere to go.`,
          )
        }
        const content = await readFile(input.partPath(record.part))
        await mkdir(dirname(record.id), { recursive: true })
        await writeFile(record.id, content)
      }
    },
  }
}
