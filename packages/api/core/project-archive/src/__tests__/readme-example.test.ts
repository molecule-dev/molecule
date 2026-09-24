/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: the object-storage archive over the
 * filesystem uploads bond, the SQLite external-state bond, and a real git
 * workspace in a temp dir. The only stand-in is the `sqlite3` CLI (not
 * installed on CI) — a tiny script on PATH that does what `.dump` does for the
 * bond: stream the database's bytes to stdout.
 *
 * @module
 */
import { execFile } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { promisify } from 'node:util'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createSqliteExternalStateProvider } from '@molecule/api-project-archive-external-state-sqlite'
import { provider as objectStorageArchive } from '@molecule/api-project-archive-object-storage'
import type { UploadProvider } from '@molecule/api-uploads'
import { setProvider as setUploads } from '@molecule/api-uploads'

import type { ArchivePart, ArchiveResult, ProjectExternalStateRecord } from '../index.js'
import {
  getExternalStateProviders,
  requireProvider,
  setExternalStateProvider,
  setProvider,
} from '../index.js'

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

  const projectsRoot = (): string => join(process.cwd(), 'projects')
  const databasePathOf = (id: string): string => join(process.cwd(), 'databases', `${id}.db`)
  const archiveIdByProject = new Map<string, string>()

  /**
   * The example's steps 1–4, verbatim.
   *
   * @param projectId - The project to archive.
   * @returns The archive result.
   */
  const archiveProject = async (projectId: string): Promise<ArchiveResult> => {
    const projectDir = join(projectsRoot(), projectId)
    const git = async (...args: string[]): Promise<string> =>
      (await promisify(execFile)('git', args, { cwd: projectDir })).stdout
    await git('clean', '-Xdf')
    const files = (await git('ls-files', '--cached', '--others', '--exclude-standard'))
      .split('\n')
      .filter(Boolean)
    const parts: ArchivePart[] = await Promise.all(
      files.map(async (file) => ({
        path: `source/${file}`,
        content: await readFile(join(projectDir, file)),
        kind: 'source',
      })),
    )

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
      requiredPaths: ['source/package.json', ...records.flatMap((r) => (r.part ? [r.part] : []))],
      metadata: { reason: 'dormant-30d' },
    })

    if (result.verified) {
      const previousStorageId = archiveIdByProject.get(projectId)
      archiveIdByProject.set(projectId, result.storageId)
      await rm(projectDir, { recursive: true, force: true })
      await rm(databasePathOf(projectId), { force: true })
      if (previousStorageId && previousStorageId !== result.storageId) {
        await requireProvider().remove(previousStorageId)
      }
    }
    return result
  }

  const makeProject = async (projectId: string): Promise<void> => {
    const dir = join(projectsRoot(), projectId)
    await mkdir(join(dir, 'node_modules/left-pad'), { recursive: true })
    await mkdir(join(dir, 'src'), { recursive: true })
    await writeFile(join(dir, '.gitignore'), 'node_modules/\n')
    await writeFile(join(dir, 'package.json'), '{"name":"demo"}')
    await writeFile(join(dir, 'src/index.ts'), 'export const answer = 42\n')
    await writeFile(join(dir, 'node_modules/left-pad/index.js'), 'module.exports = 1\n')
    await promisify(execFile)('git', ['init', '-q'], { cwd: dir })
  }

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'project-archive-readme-'))
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
      createSqliteExternalStateProvider({ databasePaths: (id) => [databasePathOf(id)] }),
    )
  })

  afterAll(async () => {
    process.chdir(originalCwd)
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    await rm(root, { recursive: true, force: true })
  })

  it('captures source + external state, and destroys the original only once verified', async () => {
    await makeProject('proj_123')
    await mkdir(join(root, 'databases'))
    await writeFile(databasePathOf('proj_123'), 'CREATE TABLE notes (id);\n')

    const result = await archiveProject('proj_123')

    expect(result.verified).toBe(true)
    expect(result.verification.digestMatched).toBe(true)
    expect(archiveIdByProject.get('proj_123')).toBe(result.storageId)
    expect(await exists(join(projectsRoot(), 'proj_123'))).toBe(false)
    expect(await exists(databasePathOf('proj_123'))).toBe(false)

    const restored = await requireProvider().restore({
      projectId: 'proj_123',
      storageId: result.storageId,
    })
    const byPath = new Map(restored.parts.map((part) => [part.path, part]))
    expect(new TextDecoder().decode(byPath.get('source/package.json')?.content)).toBe(
      '{"name":"demo"}',
    )
    expect(byPath.has('source/src/index.ts')).toBe(true)
    // .gitignored dependencies were cleaned, never archived.
    expect([...byPath.keys()].some((path) => path.includes('node_modules'))).toBe(false)

    const records = JSON.parse(
      new TextDecoder().decode(byPath.get('external-state/records.json')?.content),
    ) as ProjectExternalStateRecord[]
    expect(records).toHaveLength(1)
    expect(records[0]?.kind).toBe('sqlite')
    const dump = byPath.get(records[0]?.part ?? '')
    expect(new TextDecoder().decode(dump?.content)).toBe('CREATE TABLE notes (id);\n')
  })

  it('destroys NOTHING when a declared database cannot be captured', async () => {
    await makeProject('proj_456')
    // databasePaths declares databases/proj_456.db, but it is missing: capture THROWS.

    await expect(archiveProject('proj_456')).rejects.toThrow(/no file there/)

    expect(await exists(join(projectsRoot(), 'proj_456', 'package.json'))).toBe(true)
    expect(archiveIdByProject.has('proj_456')).toBe(false)
  })
})
