/**
 * The PGlite external-state provider: dump a project's PGlite data directories
 * into the archive, and load them back.
 *
 * @module
 */

import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { MEMORY_DATA_DIR } from '@molecule/api-database-pglite'
import type {
  ArchivePart,
  ProjectExternalStateCapture,
  ProjectExternalStateCaptureInput,
  ProjectExternalStateProvider,
  ProjectExternalStateRecord,
  ProjectExternalStateRestoreInput,
} from '@molecule/api-project-archive'

import {
  canonicalCounts,
  countLoadedDump,
  dumpDataDir,
  inflateDump,
  JoinedInstanceError,
  loadDataDir,
  sha256Hex,
  type TableCounts,
} from './datadir.js'
import type { PgliteExternalStateConfig } from './types.js'

/** Recorded on every record this provider produces; routes restores back here. */
export const KIND = 'pglite'

/** Recorded in each record so a future format change can be told apart. */
export const DUMP_FORMAT = 'pglite-datadir-tar-gzip'

/** Artifact path prefix for the dumps. */
const PART_PREFIX = 'database/pglite/'

/** Default wait for the database's single connection. */
const DEFAULT_ACQUIRE_TIMEOUT_MS = 30_000

/** Default cap on an uncompressed data directory at restore. */
const DEFAULT_MAX_DATA_DIR_BYTES = 2 * 1024 ** 3

/** One declared database, after validation. */
type Declared = { type: 'memory' } | { type: 'folder'; path: string }

/**
 * Whether a data directory string carries a `scheme://`.
 *
 * @param dataDir - The declared data directory.
 * @returns `true` when it is a URL-like location rather than a filesystem path.
 */
function hasScheme(dataDir: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(dataDir)
}

/**
 * Read the declared data directories and check the config actually answered.
 *
 * A resolver that returns `''`, a `Set`, `undefined` — anything that is not an
 * array of non-empty strings — is a BUG in the deployment, and treating it as
 * "this project owns no database" would destroy a live one. Only a real, empty
 * array declares absence.
 *
 * @param config - The provider config.
 * @param projectId - The project.
 * @returns The validated declarations, folders resolved to absolute paths.
 * @throws {Error} If the resolver returned anything else, an unsupported
 *   scheme, or the same database twice.
 */
async function resolveDeclared(
  config: PgliteExternalStateConfig,
  projectId: string,
): Promise<Declared[]> {
  const dirs = await config.dataDirs(projectId)
  if (!Array.isArray(dirs) || dirs.some((dir) => typeof dir !== 'string' || dir === '')) {
    throw new Error(
      `dataDirs(${JSON.stringify(projectId)}) must return an array of data directories; ` +
        `it returned ${Object.prototype.toString.call(dirs)}. Refusing to read that as ` +
        `"this project owns no database" — the caller destroys the project on a successful capture.`,
    )
  }
  const seen = new Set<string>()
  const declared: Declared[] = []
  for (const dir of dirs as string[]) {
    let entry: Declared
    if (dir === MEMORY_DATA_DIR) {
      entry = { type: 'memory' }
    } else if (hasScheme(dir)) {
      throw new Error(
        `dataDirs(${JSON.stringify(projectId)}) named ${dir}, which a server cannot reach. ` +
          `Only filesystem paths and "${MEMORY_DATA_DIR}" can be archived.`,
      )
    } else {
      entry = { type: 'folder', path: resolve(dir) }
    }
    const key = entry.type === 'memory' ? MEMORY_DATA_DIR : entry.path
    if (seen.has(key)) {
      throw new Error(
        `dataDirs(${JSON.stringify(projectId)}) named ${key} twice. Each database must be declared once.`,
      )
    }
    seen.add(key)
    declared.push(entry)
  }
  return declared
}

/**
 * Artifact part path for one data directory.
 *
 * @param dataDir - Absolute data directory path.
 * @returns The part path.
 */
function partPathFor(dataDir: string): string {
  return `${PART_PREFIX}${encodeURIComponent(dataDir)}.tar.gz`
}

/**
 * Check a declared folder holds a PGlite data directory.
 *
 * Opening PGlite on a folder that is not one would INITIALIZE an empty database
 * there and capture that — a successful capture of nothing.
 *
 * @param dataDir - Absolute folder path.
 * @param projectId - The project, for the message.
 * @throws {Error} If the folder is missing or holds no data directory.
 */
async function assertDataDir(dataDir: string, projectId: string): Promise<void> {
  try {
    const marker = await stat(join(dataDir, 'PG_VERSION'))
    if (!marker.isFile()) throw new Error('PG_VERSION is not a file')
  } catch (error) {
    throw new Error(
      `dataDirs named ${dataDir} for project ${projectId}, but there is no PGlite data ` +
        `directory there. Refusing to treat a missing configured database as an absent one.`,
      { cause: error },
    )
  }
}

/**
 * Throw unless two count sets are identical.
 *
 * @param expected - What the capture recorded.
 * @param actual - What the loaded database holds.
 * @param what - Description for the message.
 * @throws {Error} On any difference.
 */
function assertSameCounts(expected: TableCounts, actual: TableCounts, what: string): void {
  if (canonicalCounts(expected) !== canonicalCounts(actual)) {
    throw new Error(
      `${what}: row counts do not match. Expected ${canonicalCounts(expected)}, ` +
        `found ${canonicalCounts(actual)}.`,
    )
  }
}

/**
 * Pull this provider's fields out of a record's detail, refusing anything
 * malformed rather than guessing.
 *
 * @param record - The archived record.
 * @returns The checksum, byte size and recorded row counts.
 * @throws {Error} If a field is missing or the wrong type.
 */
function readDetail(record: ProjectExternalStateRecord): {
  sha256: string
  bytes: number
  tables: TableCounts
} {
  const detail = record.detail ?? {}
  const { sha256, bytes, tables, format } = detail
  if (format !== DUMP_FORMAT) {
    throw new Error(
      `the archive records ${record.id} in format ${String(format)}; this provider reads ${DUMP_FORMAT}`,
    )
  }
  if (typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)) {
    throw new Error(`the archive records ${record.id} without a valid sha256`)
  }
  if (typeof bytes !== 'number' || !Number.isSafeInteger(bytes) || bytes <= 0) {
    throw new Error(`the archive records ${record.id} without a valid byte size`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(String(tables))
  } catch (error) {
    throw new Error(`the archive records ${record.id} with unreadable row counts`, {
      cause: error,
    })
  }
  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed) ||
    Object.values(parsed).some((n) => typeof n !== 'string')
  ) {
    throw new Error(`the archive records ${record.id} with malformed row counts`)
  }
  return { sha256, bytes, tables: parsed as TableCounts }
}

/**
 * Whether a folder is absent, and if present, whether it is empty.
 *
 * @param dataDir - Absolute folder path.
 * @returns `'absent'`, `'empty'` or `'occupied'`.
 */
async function folderState(dataDir: string): Promise<'absent' | 'empty' | 'occupied'> {
  try {
    const info = await stat(dataDir)
    if (!info.isDirectory()) return 'occupied'
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'absent'
    throw error
  }
  return (await readdir(dataDir)).length === 0 ? 'empty' : 'occupied'
}

/**
 * Create the provider.
 *
 * @param config - How to find a project's PGlite databases.
 * @returns A provider ready to bond with `setExternalStateProvider`.
 */
export function createPgliteExternalStateProvider(
  config: PgliteExternalStateConfig,
): ProjectExternalStateProvider {
  const timeout = config.acquireTimeoutMillis ?? DEFAULT_ACQUIRE_TIMEOUT_MS
  const maxDataDirBytes = config.maxDataDirBytes ?? DEFAULT_MAX_DATA_DIR_BYTES

  return {
    kind: KIND,

    async capture(input: ProjectExternalStateCaptureInput): Promise<ProjectExternalStateCapture> {
      const declared = await resolveDeclared(config, input.projectId)

      // Check EVERY folder before dumping ANY of them, so a misconfigured fifth
      // database is caught before four dumps exist and nothing partial is returned.
      for (const entry of declared) {
        if (entry.type === 'folder') await assertDataDir(entry.path, input.projectId)
      }

      const parts: ArchivePart[] = []
      const records: ProjectExternalStateRecord[] = []

      for (const entry of declared) {
        if (entry.type === 'memory') {
          // Declared, not inferred: an in-memory database has nothing durable,
          // and the archive says so explicitly rather than omitting it.
          records.push({ kind: KIND, id: MEMORY_DATA_DIR, detail: { durable: false } })
          continue
        }

        const dataDir = entry.path
        const dump = await dumpDataDir(dataDir, timeout)
        const sha256 = sha256Hex(dump.bytes)

        // Round-trip through the scratch directory, like the sibling providers:
        // what gets archived is what was written, byte for byte.
        const scratch = join(input.workDir, `${encodeURIComponent(dataDir)}.tar.gz`)
        await writeFile(scratch, dump.bytes)
        const content = new Uint8Array(await readFile(scratch))
        if (content.byteLength !== dump.bytes.byteLength || sha256Hex(content) !== sha256) {
          throw new Error(
            `the dump of ${dataDir} changed between being written and read back. ` +
              `Refusing to archive it.`,
          )
        }

        // Prove the dump loads and holds what was counted BEFORE the caller is
        // told it may destroy the original.
        const loaded = await countLoadedDump(await inflateDump(content, maxDataDirBytes))
        assertSameCounts(dump.tables, loaded, `the dump of ${dataDir} does not load back intact`)

        const path = partPathFor(dataDir)
        parts.push({
          path,
          content,
          kind: 'database',
          meta: { engine: KIND, dataDir, format: DUMP_FORMAT, sha256 },
        })
        records.push({
          kind: KIND,
          id: dataDir,
          part: path,
          detail: {
            format: DUMP_FORMAT,
            sha256,
            bytes: content.byteLength,
            tables: JSON.stringify(dump.tables),
            postgresVersion: dump.postgresVersion,
          },
        })
      }

      return { parts, records }
    },

    async restore(input: ProjectExternalStateRestoreInput): Promise<void> {
      const declared = await resolveDeclared(config, input.projectId)
      const folders = new Set(declared.flatMap((d) => (d.type === 'folder' ? [d.path] : [])))
      const memoryDeclared = declared.some((d) => d.type === 'memory')

      // Validate every record and its bytes before touching any folder, so a bad
      // record cannot leave the project half restored.
      const plans: Array<{ dataDir: string; tar: Uint8Array<ArrayBuffer>; tables: TableCounts }> =
        []
      for (const record of input.records) {
        if (record.id === MEMORY_DATA_DIR) {
          if (record.part || record.detail?.durable !== false) {
            throw new Error('the archive records an in-memory database with data attached')
          }
          if (!memoryDeclared) {
            throw new Error(
              `the archive records an in-memory database, but dataDirs(${JSON.stringify(input.projectId)}) ` +
                `does not declare "${MEMORY_DATA_DIR}"`,
            )
          }
          continue
        }
        if (!record.part) {
          throw new Error(`the archive records database ${record.id} with no dump to restore from`)
        }
        if (!folders.has(record.id)) {
          throw new Error(
            `the archive holds the database ${record.id}, but dataDirs(${JSON.stringify(input.projectId)}) ` +
              `does not name it. Refusing to report the project restored while one of its ` +
              `databases has nowhere to go.`,
          )
        }
        const { sha256, bytes, tables } = readDetail(record)

        let content: Uint8Array
        try {
          content = new Uint8Array(await readFile(input.partPath(record.part)))
        } catch (error) {
          throw new Error(`the dump of ${record.id} is missing from the archive`, { cause: error })
        }
        if (content.byteLength !== bytes || sha256Hex(content) !== sha256) {
          throw new Error(
            `the dump of ${record.id} does not match its recorded checksum ` +
              `(${content.byteLength} bytes, expected ${bytes}). Refusing to restore it.`,
          )
        }

        const state = await folderState(record.id)
        if (state === 'occupied') {
          throw new Error(
            `cannot restore ${record.id}: something is already there. Restore into an empty ` +
              `or absent folder, so a live database is never overwritten.`,
          )
        }
        plans.push({ dataDir: record.id, tar: await inflateDump(content, maxDataDirBytes), tables })
      }

      for (const plan of plans) {
        const before = await folderState(plan.dataDir)
        if (before === 'occupied') {
          throw new Error(`cannot restore ${plan.dataDir}: it was written to while restoring`)
        }
        try {
          const { tables } = await loadDataDir(plan.dataDir, plan.tar, timeout)
          assertSameCounts(plan.tables, tables, `the restored database at ${plan.dataDir}`)
        } catch (error) {
          // A folder another pool holds is theirs — never clean it up.
          if (!(error instanceof JoinedInstanceError)) {
            await rm(plan.dataDir, { recursive: true, force: true })
            if (before === 'empty') await mkdir(plan.dataDir, { recursive: true })
          }
          throw error
        }
      }
    },
  }
}
