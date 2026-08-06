/**
 * The Cloudflare D1 external-state provider: export a project's D1 databases
 * into the archive, and load them back.
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
import type { D1ExternalStateConfig } from './types.js'

/** Recorded on every record this provider produces; routes restores back here. */
export const KIND = 'd1'

/** Artifact path prefix for the dumps. */
const PART_PREFIX = 'database/d1/'

/**
 * Read the configured names and check the config actually answered.
 *
 * @param config - The provider config.
 * @param projectId - The project.
 * @returns The validated database names.
 * @throws {Error} If the resolver returned anything but an array of names.
 */
async function resolveNames(config: D1ExternalStateConfig, projectId: string): Promise<string[]> {
  const names = await config.databaseNames(projectId)
  if (!Array.isArray(names) || names.some((name) => typeof name !== 'string' || name === '')) {
    throw new Error(
      `databaseNames(${JSON.stringify(projectId)}) must return an array of D1 database names; ` +
        `it returned ${Object.prototype.toString.call(names)}. Refusing to read that as ` +
        `"this project owns no database" — the caller destroys the project on a successful capture.`,
    )
  }
  return [...names]
}

/** Artifact part path for one database. */
function partPathFor(name: string): string {
  return `${PART_PREFIX}${encodeURIComponent(name)}.sql`
}

/** The wrangler argv shared by capture and restore. */
function baseArgs(config: D1ExternalStateConfig): string[] {
  return [...(config.remote === false ? [] : ['--remote']), ...(config.wranglerArgs ?? [])]
}

/**
 * Create the provider.
 *
 * @param config - How to find a project's D1 databases.
 * @returns A provider ready to bond with `setExternalStateProvider`.
 */
export function createD1ExternalStateProvider(
  config: D1ExternalStateConfig,
): ProjectExternalStateProvider {
  const wrangler = config.wranglerPath ?? 'wrangler'

  return {
    kind: KIND,

    async capture(input: ProjectExternalStateCaptureInput): Promise<ProjectExternalStateCapture> {
      const names = await resolveNames(config, input.projectId)

      const parts: ArchivePart[] = []
      const records: ProjectExternalStateCapture['records'] = []

      for (const name of names) {
        const dumpPath = join(input.workDir, `${encodeURIComponent(name)}.sql`)
        // `d1 export` emits portable SQL (schema + data) from the engine that
        // owns the data, which is the only thing that can produce a consistent
        // snapshot — reading rows through the app's own store would miss schema,
        // indexes and constraints, and would race writes mid-read.
        const bytes = await dumpToFile(
          wrangler,
          ['d1', 'export', name, ...baseArgs(config), '--output', dumpPath],
          dumpPath,
        )
        const content = new Uint8Array(await readFile(dumpPath))
        if (content.byteLength !== bytes) {
          throw new Error(
            `the export of D1 database ${name} is ${content.byteLength} bytes on disk but ` +
              `${bytes} were streamed. Refusing to archive a file that changed under us.`,
          )
        }
        if (content.byteLength === 0) {
          // An empty export is not a valid "empty database": `d1 export` always
          // emits at least schema statements. Zero bytes means the export did not
          // happen (wrong name, wrong account, silent auth failure), and treating
          // it as an empty database would let the caller destroy the real one.
          throw new Error(
            `the export of D1 database ${name} is empty. Refusing to treat a zero-byte export ` +
              `as an empty database — check the name, CLOUDFLARE_ACCOUNT_ID and the API token.`,
          )
        }
        const path = partPathFor(name)
        parts.push({ path, content, kind: 'database', meta: { engine: KIND, source: name } })
        records.push({ kind: KIND, id: name, part: path })
      }

      return { parts, records }
    },

    async restore(input: ProjectExternalStateRestoreInput): Promise<void> {
      const names = new Set(await resolveNames(config, input.projectId))

      for (const record of input.records) {
        if (!record.part) {
          throw new Error(
            `the archive records D1 database ${record.id} with no export to restore from`,
          )
        }
        if (!names.has(record.id)) {
          throw new Error(
            `the archive holds the D1 database ${record.id}, but databaseNames(${JSON.stringify(input.projectId)}) ` +
              `does not name it. Refusing to report the project restored while one of its ` +
              `databases has nowhere to go.`,
          )
        }
        // The path goes in argv, not stdin: `d1 execute` reads `--file` itself.
        // Passing '' for srcPath tells the helper to close stdin rather than
        // stream a file wrangler would never read.
        await restoreFromFile(
          wrangler,
          ['d1', 'execute', record.id, ...baseArgs(config), '--file', input.partPath(record.part)],
          '',
        )
      }
    },
  }
}
