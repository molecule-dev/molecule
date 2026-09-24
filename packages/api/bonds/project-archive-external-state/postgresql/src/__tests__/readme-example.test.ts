/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the real object-storage archive over
 * the real filesystem uploads bond, in a temp cwd. The only stand-ins are the
 * PostgreSQL client tools (`pg_dump`, `dropdb` — not installed on CI): tiny
 * scripts on PATH that record how they were called.
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

import { createPostgresqlExternalStateProvider } from '../index.js'

describe('README @example', () => {
  const originalCwd = process.cwd()
  let root = ''
  let filesystemUploads: UploadProvider
  const databaseNameOf = (projectId: string): string => `app_${projectId}`
  const databaseUrlOf = (projectId: string): string =>
    `postgres://archiver@db.example.com:5432/${databaseNameOf(projectId)}`
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
      await promisify(execFile)('dropdb', [
        '--host=db.example.com',
        '--username=archiver',
        '--if-exists',
        '--',
        databaseNameOf(projectId),
      ])
    }
    return { result, records }
  }

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'postgresql-external-state-readme-'))
    process.chdir(root)
    const bin = join(root, 'bin')
    await mkdir(bin)
    // pg_dump stand-in: fails for a database named "app_broken", otherwise emits a
    // dump that names the libpq env it was given (proving creds left argv).
    await writeFile(
      join(bin, 'pg_dump'),
      '#!/bin/sh\n' +
        '[ "$PGDATABASE" = "app_broken" ] && { echo "permission denied" >&2; exit 1; }\n' +
        'printf "PGDMP %s@%s:%s/%s pw=%s args=%s" "$PGUSER" "$PGHOST" "$PGPORT" "$PGDATABASE" "$PGPASSWORD" "$*"\n',
    )
    await writeFile(join(bin, 'dropdb'), `#!/bin/sh\necho "$*" >> ${join(root, 'dropped.log')}\n`)
    await chmod(join(bin, 'pg_dump'), 0o755)
    await chmod(join(bin, 'dropdb'), 0o755)
    vi.stubEnv('PATH', `${bin}${delimiter}${process.env.PATH ?? ''}`)
    vi.stubEnv('PGPASSWORD', 'test-password')
    vi.stubEnv('FILE_UPLOAD_PATH', 'uploads')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    // Imported after cwd/FILE_UPLOAD_PATH are set: the bond resolves its directory at import.
    ;({ provider: filesystemUploads } = await import('@molecule/api-uploads-filesystem'))

    setUploads(filesystemUploads)
    setProvider(objectStorageArchive)
    setExternalStateProvider(
      createPostgresqlExternalStateProvider({
        databaseUrls: (projectId) => [databaseUrlOf(projectId)],
      }),
    )
  })

  afterAll(async () => {
    process.chdir(originalCwd)
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    await rm(root, { recursive: true, force: true })
  })

  it('dumps the declared database, archives it verified, and only then drops it', async () => {
    const { result, records } = await archiveProject('proj_123')

    expect(result.verified).toBe(true)
    expect(archiveIdByProject.get('proj_123')).toBe(result.storageId)
    expect(records).toEqual([{ kind: 'postgresql', id: 'app_proj_123', part: expect.any(String) }])
    expect(await readFile(join(root, 'dropped.log'), 'utf8')).toBe(
      '--host=db.example.com --username=archiver --if-exists -- app_proj_123\n',
    )

    const { parts } = await requireProvider().restore({
      projectId: 'proj_123',
      storageId: result.storageId,
    })
    const dumpPart = parts.find((part) => part.path === records[0]?.part)
    expect(new TextDecoder().decode(dumpPart?.content)).toBe(
      'PGDMP archiver@db.example.com:5432/app_proj_123 pw=test-password ' +
        'args=--format=custom --no-owner --no-privileges -- app_proj_123',
    )
  })

  it('THROWS — and drops nothing — when the dump fails', async () => {
    await rm(join(root, 'dropped.log'), { force: true })
    await expect(archiveProject('broken')).rejects.toThrow(/pg_dump exited 1: permission denied/)
    expect(archiveIdByProject.has('broken')).toBe(false)
    await expect(readFile(join(root, 'dropped.log'), 'utf8')).rejects.toThrow(/ENOENT/)
  })
})
