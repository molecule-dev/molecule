/**
 * The upload folder the provider creates ignores itself in git.
 *
 * Files land in `uploads/` under the working directory by default, and nothing told git about it:
 * every one of the 150 template apps (all of which use this provider) would commit what its users
 * uploaded, and in the harness eval `add` both coding agents spent a step adding `uploads` to the
 * project's `.gitignore` after their own test upload. The folder now carries a `.gitignore` of `*`
 * when the provider creates it, and that file is not reachable as an upload.
 *
 * @module
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'

const silentLogger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
const made: string[] = []

/** The provider module as loaded with `FILE_UPLOAD_PATH` set to `value`. */
async function load(value: string): Promise<typeof ProviderModule> {
  vi.resetModules()
  vi.stubEnv('FILE_UPLOAD_PATH', value)
  const { bond } = await import('@molecule/api-bond')
  bond('logger', silentLogger)
  return import('../provider.js')
}

/** A new temp directory, removed after the test. */
function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-gitignore-'))
  made.push(dir)
  return dir
}

afterEach(() => {
  vi.unstubAllEnvs()
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

describe('the upload folder ignores itself in git', () => {
  it('writes a .gitignore of * into a folder it creates (OLD MUSTFAIL)', async () => {
    const folder = path.join(tempDir(), 'uploads')
    await load(folder)
    expect(fs.readFileSync(path.join(folder, '.gitignore'), 'utf8')).toBe('*\n')
  })

  it('serves and deletes no dot-name: the .gitignore is not an upload (OLD MUSTFAIL)', async () => {
    const folder = path.join(tempDir(), 'uploads')
    const { provider, deleteFile, getFileStream } = await load(folder)
    expect(await provider.getFile?.('.gitignore')).toBeNull()
    expect(await provider.getFile?.('x/../.gitignore')).toBeNull()
    // Not an id `upload()` minted, so there is nothing to remove, and no stream to hand out.
    await expect(deleteFile('.gitignore')).resolves.toBeUndefined()
    expect(() => getFileStream('.gitignore')).toThrow('Invalid file ID')
    expect(fs.existsSync(path.join(folder, '.gitignore'))).toBe(true)
  })

  it('counterexample: a stored file is still served by its id', async () => {
    const folder = path.join(tempDir(), 'uploads')
    const { provider } = await load(folder)
    const id = '550e8400-e29b-41d4-a716-446655440000'
    fs.writeFileSync(path.join(folder, id), 'bytes')
    const stream = await provider.getFile?.(id)
    expect(stream).not.toBeNull()
    const chunks: Buffer[] = []
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk as Buffer))
    expect(Buffer.concat(chunks).toString()).toBe('bytes')
  })

  it('counterexample: a folder that already existed gets no .gitignore', async () => {
    const folder = tempDir()
    await load(folder)
    expect(fs.existsSync(path.join(folder, '.gitignore'))).toBe(false)
  })
})
