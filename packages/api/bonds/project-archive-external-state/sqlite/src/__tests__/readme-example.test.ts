/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the real object-storage archive over
 * the real filesystem uploads bond, in a temp cwd. The only stand-in is the
 * `sqlite3` CLI (not installed on CI) — a tiny script on PATH that does what
 * `.dump` does for the bond: stream the database's bytes to stdout.
 *
 * @module
 */
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'

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

import { createSqliteExternalStateProvider } from '../index.js'

const exists = async (path: string): Promise<boolean> =>
  stat(path).then(
    () => true,
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return false
      throw error
    },
  )

describe('README @example', () => {
  const originalCwd = process.cwd()
  let root = ''
  let filesystemUploads: UploadProvider
  const databasePathOf = (projectId: string): string =>
    join(process.cwd(), 'databases', `${projectId}.db`)
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
      await rm(databasePathOf(projectId))
    }
    return { result, records }
  }

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'sqlite-external-state-readme-'))
    process.chdir(root)
    // Stand-in for the sqlite3 CLI: `sqlite3 -- <db> .dump` streams the db.
    await mkdir(join(root, 'bin'))
    await writeFile(join(root, 'bin/sqlite3'), '#!/bin/sh\n[ "$3" = ".dump" ] && cat "$2"\n')
    await chmod(join(root, 'bin/sqlite3'), 0o755)
    vi.stubEnv('PATH', `${join(root, 'bin')}${delimiter}${process.env.PATH ?? ''}`)
    vi.stubEnv('FILE_UPLOAD_PATH', 'uploads')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    // Imported after cwd/FILE_UPLOAD_PATH are set: the bond resolves its directory at import.
    ;({ provider: filesystemUploads } = await import('@molecule/api-uploads-filesystem'))

    setUploads(filesystemUploads)
    setProvider(objectStorageArchive)
    setExternalStateProvider(
      createSqliteExternalStateProvider({
        databasePaths: (projectId) => [databasePathOf(projectId)],
      }),
    )
  })

  afterAll(async () => {
    process.chdir(originalCwd)
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    await rm(root, { recursive: true, force: true })
  })

  it('captures the declared database, archives it verified, and only then deletes it', async () => {
    await mkdir(join(root, 'databases'))
    const dump = 'CREATE TABLE notes (id);\n'
    await writeFile(databasePathOf('proj_123'), dump)

    const { result, records } = await archiveProject('proj_123')

    expect(result.verified).toBe(true)
    expect(archiveIdByProject.get('proj_123')).toBe(result.storageId)
    expect(await exists(databasePathOf('proj_123'))).toBe(false)
    expect(records).toEqual([
      expect.objectContaining({ kind: 'sqlite', id: databasePathOf('proj_123') }),
    ])

    // The artifact really holds the dump and the record index.
    const { parts } = await requireProvider().restore({
      projectId: 'proj_123',
      storageId: result.storageId,
    })
    const dumpPart = parts.find((part) => part.path === records[0]?.part)
    expect(new TextDecoder().decode(dumpPart?.content)).toBe(dump)
    const indexPart = parts.find((part) => part.path === 'external-state/records.json')
    expect(JSON.parse(new TextDecoder().decode(indexPart?.content))).toEqual(records)
    expect(await readFile(join(root, 'uploads', result.storageId))).toBeInstanceOf(Buffer)
  })

  it('THROWS — and destroys nothing — when the declared database is missing', async () => {
    await expect(archiveProject('proj_missing')).rejects.toThrow(/there is no file there/)
    expect(archiveIdByProject.has('proj_missing')).toBe(false)
  })
})
