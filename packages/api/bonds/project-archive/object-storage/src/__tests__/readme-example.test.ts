/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: this bond over the REAL filesystem
 * uploads bond and a real git workspace, all in a temp cwd. Nothing is mocked.
 *
 * @module
 */
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { ArchivePart, ArchiveResult } from '@molecule/api-project-archive'
import { requireProvider, setProvider } from '@molecule/api-project-archive'
import type { UploadProvider } from '@molecule/api-uploads'
import { setProvider as setUploads } from '@molecule/api-uploads'

import { provider as objectStorageArchive } from '../index.js'

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
  const projectId = 'proj_123'
  const projectDir = (): string => join(process.cwd(), 'projects', projectId)
  const archiveIdByProject = new Map<string, string>()

  /**
   * The example's archive steps, verbatim.
   *
   * @returns The archive result.
   */
  const archiveProject = async (): Promise<ArchiveResult> => {
    const git = async (...args: string[]): Promise<string> =>
      (await promisify(execFile)('git', args, { cwd: projectDir() })).stdout
    await git('clean', '-Xdf')
    const files = (await git('ls-files', '--cached', '--others', '--exclude-standard'))
      .split('\n')
      .filter(Boolean)
    const parts: ArchivePart[] = await Promise.all(
      files.map(async (file) => ({
        path: `source/${file}`,
        content: await readFile(join(projectDir(), file)),
        kind: 'source',
      })),
    )

    const result = await requireProvider().archive({
      projectId,
      parts,
      requiredPaths: ['source/package.json'],
      metadata: { reason: 'dormant-30d' },
    })
    if (result.verified) {
      const previousStorageId = archiveIdByProject.get(projectId)
      archiveIdByProject.set(projectId, result.storageId)
      await rm(projectDir(), { recursive: true, force: true })
      if (previousStorageId && previousStorageId !== result.storageId) {
        await requireProvider().remove(previousStorageId)
      }
    }
    return result
  }

  /** The example's restore step, verbatim. */
  const restoreProject = async (): Promise<void> => {
    const storageId = archiveIdByProject.get(projectId)
    if (storageId) {
      const restored = await requireProvider().restore({ projectId, storageId })
      for (const part of restored.parts) {
        const target = join(projectDir(), part.path.replace(/^source\//, ''))
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, part.content, { mode: part.mode })
      }
    }
  }

  const makeProject = async (): Promise<void> => {
    const dir = projectDir()
    await mkdir(join(dir, 'node_modules/left-pad'), { recursive: true })
    await mkdir(join(dir, 'src'), { recursive: true })
    await writeFile(join(dir, '.gitignore'), 'node_modules/\n')
    await writeFile(join(dir, 'package.json'), '{"name":"demo"}')
    await writeFile(join(dir, 'src/index.ts'), 'export const answer = 42\n')
    await writeFile(join(dir, 'node_modules/left-pad/index.js'), 'module.exports = 1\n')
    await promisify(execFile)('git', ['init', '-q'], { cwd: dir })
  }

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'object-storage-archive-readme-'))
    process.chdir(root)
    vi.stubEnv('FILE_UPLOAD_PATH', 'uploads')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    // Imported after cwd/FILE_UPLOAD_PATH are set: the bond resolves its directory at import.
    ;({ provider: filesystemUploads } = await import('@molecule/api-uploads-filesystem'))

    setUploads(filesystemUploads)
    setProvider(objectStorageArchive)
  })

  afterAll(async () => {
    process.chdir(originalCwd)
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    await rm(root, { recursive: true, force: true })
  })

  it('archives the git-tracked source, deletes only once verified, and restores it', async () => {
    await makeProject()

    const first = await archiveProject()
    expect(first.verified).toBe(true)
    expect(first.manifest.parts.count).toBe(3) // .gitignore, package.json, src/index.ts
    expect(archiveIdByProject.get(projectId)).toBe(first.storageId)
    expect(await exists(projectDir())).toBe(false)

    await restoreProject()
    expect(await readFile(join(projectDir(), 'src/index.ts'), 'utf8')).toBe(
      'export const answer = 42\n',
    )
    expect(await exists(join(projectDir(), 'node_modules'))).toBe(false)

    // Re-archive: a NEW storage id, and the old artifact is removed only after it verified.
    await promisify(execFile)('git', ['init', '-q'], { cwd: projectDir() })
    const second = await archiveProject()
    expect(second.verified).toBe(true)
    expect(second.storageId).not.toBe(first.storageId)
    expect(await requireProvider().status(first.storageId)).toBeNull()
    expect(await requireProvider().status(second.storageId)).not.toBeNull()
  })

  it('THROWS — and deletes nothing — when a required part is missing', async () => {
    await rm(projectDir(), { recursive: true, force: true })
    await makeProject()
    await rm(join(projectDir(), 'package.json'))
    const before = archiveIdByProject.get(projectId)

    await expect(archiveProject()).rejects.toThrow(/source\/package\.json/)
    expect(await exists(join(projectDir(), 'src/index.ts'))).toBe(true)
    expect(archiveIdByProject.get(projectId)).toBe(before)
  })
})
