/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the real object-storage archive over
 * the real filesystem uploads bond, in a temp cwd. The only stand-in is the
 * `wrangler` CLI (not installed on CI, and it would reach Cloudflare): a tiny
 * script on PATH that emits the export on stdout — where this bond's
 * `dumpToFile` reads it from — and records `d1 delete` calls.
 *
 * @module
 */
import { execFile } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { promisify } from 'node:util'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type {
  ArchivePart,
  ArchiveResult,
  ProjectExternalStateRecord,
} from '@molecule/api-project-archive'
import {
  getExternalStateProviders,
  requireProvider,
  setExternalStateProvider,
  setProvider,
} from '@molecule/api-project-archive'
import { provider as objectStorageArchive } from '@molecule/api-project-archive-object-storage'
import type { UploadProvider } from '@molecule/api-uploads'
import { setProvider as setUploads } from '@molecule/api-uploads'

import { createD1ExternalStateProvider } from '../index.js'

describe('README @example', () => {
  const originalCwd = process.cwd()
  let root = ''
  let filesystemUploads: UploadProvider
  const databaseNameOf = (projectId: string): string => `mol_${projectId}`
  const archiveIdByProject = new Map<string, string>()

  /**
   * The example's archive steps, verbatim.
   *
   * @param projectId - The project to archive.
   * @returns The archive result and the captured records.
   */
  const archiveProject = async (
    projectId: string,
  ): Promise<{ result: ArchiveResult; records: ProjectExternalStateRecord[] }> => {
    const parts: ArchivePart[] = []
    const records: ProjectExternalStateRecord[] = []
    const workDir = await mkdtemp(join(tmpdir(), 'archive-'))
    try {
      for (const stateProvider of getExternalStateProviders().values()) {
        const captured = await stateProvider.capture({ projectId, workDir })
        parts.push(...captured.parts)
        records.push(...captured.records)
      }
    } finally {
      await rm(workDir, { recursive: true, force: true })
    }
    const index = new TextEncoder().encode(JSON.stringify(records))
    parts.push({ path: 'external-state/records.json', content: index, kind: 'external-state' })

    const result = await requireProvider().archive({
      projectId,
      parts,
      requiredPaths: records.flatMap((record) => (record.part ? [record.part] : [])),
    })
    if (result.verified) {
      archiveIdByProject.set(projectId, result.storageId)
      await promisify(execFile)('wrangler', [
        'd1',
        'delete',
        databaseNameOf(projectId),
        '--skip-confirmation',
      ])
    }
    return { result, records }
  }

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'd1-external-state-readme-'))
    process.chdir(root)
    const bin = join(root, 'bin')
    await mkdir(bin)
    // wrangler stand-in: `d1 export` fails for "mol_broken" and otherwise emits SQL
    // naming its argv; `d1 delete` is recorded.
    await writeFile(
      join(bin, 'wrangler'),
      '#!/bin/sh\n' +
        `[ "$2" = "delete" ] && { echo "$*" >> ${join(root, 'dropped.log')}; exit 0; }\n` +
        '[ "$3" = "mol_broken" ] && { echo "Couldn\'t find DB" >&2; exit 1; }\n' +
        'printf "CREATE TABLE notes (id); -- %s" "$*"\n',
    )
    await chmod(join(bin, 'wrangler'), 0o755)
    vi.stubEnv('PATH', `${bin}${delimiter}${process.env.PATH ?? ''}`)
    vi.stubEnv('FILE_UPLOAD_PATH', 'uploads')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    // Imported after cwd/FILE_UPLOAD_PATH are set: the bond resolves its directory at import.
    ;({ provider: filesystemUploads } = await import('@molecule/api-uploads-filesystem'))

    setUploads(filesystemUploads)
    setProvider(objectStorageArchive)
    setExternalStateProvider(
      createD1ExternalStateProvider({
        databaseNames: (projectId) => [databaseNameOf(projectId)],
      }),
    )
  })

  afterAll(async () => {
    process.chdir(originalCwd)
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    await rm(root, { recursive: true, force: true })
  })

  it('exports the declared remote database, archives it verified, and only then deletes it', async () => {
    const { result, records } = await archiveProject('proj_123')

    expect(result.verified).toBe(true)
    expect(archiveIdByProject.get('proj_123')).toBe(result.storageId)
    expect(records).toEqual([{ kind: 'd1', id: 'mol_proj_123', part: expect.any(String) }])
    expect(await readFile(join(root, 'dropped.log'), 'utf8')).toBe(
      'd1 delete mol_proj_123 --skip-confirmation\n',
    )

    const { parts } = await requireProvider().restore({
      projectId: 'proj_123',
      storageId: result.storageId,
    })
    const dumpPart = parts.find((part) => part.path === records[0]?.part)
    expect(new TextDecoder().decode(dumpPart?.content)).toMatch(
      /^CREATE TABLE notes \(id\); -- d1 export mol_proj_123 --remote --output /,
    )
  })

  it('THROWS — and deletes nothing — when the export fails', async () => {
    await rm(join(root, 'dropped.log'), { force: true })
    await expect(archiveProject('broken')).rejects.toThrow(/wrangler exited 1: Couldn't find DB/)
    expect(archiveIdByProject.has('broken')).toBe(false)
    await expect(readFile(join(root, 'dropped.log'), 'utf8')).rejects.toThrow(/ENOENT/)
  })
})
