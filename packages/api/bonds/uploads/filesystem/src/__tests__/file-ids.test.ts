/**
 * The file ids of the filesystem bond, against the real disk: `getFile`, `deleteFile` and
 * `getFileStream` answer for the ids the bond mints, and for nothing else a client may send.
 *
 * Upload security review (2026-11-25), finding 4: two id shapes answered 500 with the upload path
 * in the message, an id could name a file the bond never stored (a nested path, a symlink), and
 * `getFileStream()` handed out a stream that errored with no listener. Finding 8: the bond logged
 * every such id at `warn`, which any client could trigger.
 *
 * @module
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

/** Folders this file created, removed after each test. */
const made: string[] = []

/** A new, empty folder under the system temp directory. */
function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-file-ids-'))
  made.push(dir)
  return dir
}

/** The provider module, loaded with `FILE_UPLOAD_PATH` set to a new folder. */
async function load(): Promise<typeof ProviderModule & { folder: string }> {
  vi.resetModules()
  const folder = tempDir()
  vi.stubEnv('FILE_UPLOAD_PATH', folder)
  const { bond } = await import('@molecule/api-bond')
  bond('logger', mockLogger)
  return { ...(await import('../provider.js')), folder }
}

/** Stores `content` through `upload()`, as the multipart parser does, and returns the file's id. */
async function store(mod: typeof ProviderModule, content: string): Promise<string> {
  const source = new PassThrough()
  const file = mod.upload(
    'doc',
    source,
    { filename: 'notes.txt', encoding: '7bit', mimeType: 'text/plain' },
    vi.fn(),
  )
  source.end(content)
  await file.uploadPromise
  return file.id
}

/** Reads a stream to its end. */
async function text(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer))
  return Buffer.concat(chunks).toString('utf8')
}

/** Everything under `root`: each path with its content, or what kind of entry it is. */
function snapshot(root: string): Record<string, string> {
  const out: Record<string, string> = {}
  const walk = (dir: string, prefix: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    entries.sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      const rel = prefix + entry.name
      if (entry.isDirectory()) {
        out[rel] = '(directory)'
        walk(full, `${rel}/`)
      } else if (entry.isSymbolicLink()) out[rel] = `-> ${fs.readlinkSync(full)}`
      else out[rel] = fs.readFileSync(full, 'utf8')
    }
  }
  walk(root, '')
  return out
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  for (const dir of made.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

describe('file ids', () => {
  it('serves and deletes a stored file by the id the bond minted', async () => {
    const mod = await load()
    const id = await store(mod, 'hello')
    expect(id).toMatch(/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/)

    expect(await text((await mod.provider.getFile!(id))!)).toBe('hello')
    expect(await text(mod.getFileStream(id))).toBe('hello')
    await mod.deleteFile(id)
    expect(fs.existsSync(path.join(mod.folder, id))).toBe(false)
    expect(await mod.provider.getFile!(id)).toBeNull()
  })

  // Finding 4: each row of the review's table, against the real disk.
  it('answers for nothing but a stored file: no nested path, NUL, long id, symlink or directory (OLD MUSTFAIL)', async () => {
    const mod = await load()
    const id = await store(mod, 'the upload')
    // A file of the operator's own under the folder, a symlink out of it, a folder with an id's
    // shape, and the folder's own .gitignore: none is an upload.
    fs.mkdirSync(path.join(mod.folder, 'exports'))
    fs.writeFileSync(path.join(mod.folder, 'exports', 'report.txt'), 'not an upload')
    const outside = path.join(tempDir(), 'secret.txt')
    fs.writeFileSync(outside, 'outside the folder')
    fs.symlinkSync(outside, path.join(mod.folder, 'link'))
    const directory = '11111111-2222-4333-8444-555555555555'
    fs.mkdirSync(path.join(mod.folder, directory))
    fs.writeFileSync(path.join(mod.folder, '.gitignore'), '*\n')

    const refused = [
      'exports/report.txt', // `exports%2Freport.txt` once Express decoded it
      `${id}\u0000`, // `<id>%00`
      'a'.repeat(300),
      'link',
      directory,
      '.gitignore',
      '../../../etc/hostname',
      id.toUpperCase(), // not the shape the bond mints
      '',
    ]
    const before = snapshot(mod.folder)

    for (const bad of refused) {
      await expect(mod.provider.getFile!(bad), bad).resolves.toBeNull()
      // Deleting one is nothing to do, and touches nothing.
      await expect(mod.deleteFile(bad), bad).resolves.toBeUndefined()
    }
    expect(snapshot(mod.folder)).toEqual(before)
    expect(fs.readFileSync(outside, 'utf8')).toBe('outside the folder')

    // A well-shaped id that no file has names no upload either: nothing to serve. Deleting it
    // reports the missing file, as it always has.
    const missing = '550e8400-e29b-41d4-a716-446655440000'
    expect(await mod.provider.getFile!(missing)).toBeNull()
    expect(() => mod.getFileStream(missing)).toThrow(expect.objectContaining({ code: 'ENOENT' }))
    await expect(mod.deleteFile(missing)).rejects.toMatchObject({ code: 'ENOENT' })

    // Counterexample: the stored file is still there, and still served.
    expect(await text((await mod.provider.getFile!(id))!)).toBe('the upload')
  })

  it('leaves a symlink alone when asked to delete it, and what it points at', async () => {
    const mod = await load()
    const outside = path.join(tempDir(), 'secret.txt')
    fs.writeFileSync(outside, 'outside the folder')
    const link = '550e8400-e29b-41d4-a716-446655440000'
    fs.symlinkSync(outside, path.join(mod.folder, link))

    await mod.deleteFile(link)
    // A symlink is not an upload: it is left alone too.
    expect(fs.lstatSync(path.join(mod.folder, link)).isSymbolicLink()).toBe(true)
    expect(fs.readFileSync(outside, 'utf8')).toBe('outside the folder')
  })

  // Finding 4: `getFileStream()` is still exported. It throws where `getFile()` answers `null`, so a
  // caller's try or the framework's error handler sees the failure, never a stream that errors later.
  it('hands out no stream for an id with no stored file, so no error is left unhandled (OLD MUSTFAIL)', async () => {
    const mod = await load()
    const id = await store(mod, 'the upload')
    fs.mkdirSync(path.join(mod.folder, 'exports'))
    fs.writeFileSync(path.join(mod.folder, 'exports', 'report.txt'), 'not an upload')
    fs.symlinkSync(path.join(mod.folder, id), path.join(mod.folder, 'link'))

    for (const bad of [
      '550e8400-e29b-41d4-a716-446655440000', // missing
      `${id}\u0000`,
      'a'.repeat(300),
      'exports/report.txt',
      'link',
      'exports',
      '.gitignore',
    ]) {
      let stream: fs.ReadStream | undefined
      try {
        stream = mod.getFileStream(bad)
      } catch (error) {
        expect(String(error), JSON.stringify(bad)).toMatch(/Invalid file ID|ENOENT/)
      }
      if (stream) {
        // Listen before the stream can emit: before the fix one of these errored with no listener,
        // which ends the process. Report what it did instead of ending the test process.
        const outcome = await new Promise<string>((resolve) => {
          const chunks: Buffer[] = []
          stream.on('data', (chunk: Buffer) => chunks.push(chunk))
          stream.once('error', (error: Error) => resolve(`errored: ${error.message}`))
          stream.once('end', () =>
            resolve(`sent ${JSON.stringify(Buffer.concat(chunks).toString())}`),
          )
        })
        expect.fail(`${JSON.stringify(bad)}: a stream that ${outcome}`)
      }
    }
    // Counterexample: the stored file's stream is still handed out, and reads whole.
    expect(await text(mod.getFileStream(id))).toBe('the upload')
  })

  // Finding 8: any client can send an id that names no upload, so it is not worth a `warn` each.
  it('notes an id that names no upload at debug, not at warn (OLD MUSTFAIL)', async () => {
    const mod = await load()
    await expect(mod.provider.getFile!('exports/report.txt')).resolves.toBeNull()
    await expect(mod.provider.getFile!('../x')).resolves.toBeNull()
    expect(mockLogger.warn).not.toHaveBeenCalled()
    expect(mockLogger.debug).toHaveBeenCalledTimes(2)
    expect(mockLogger.debug.mock.calls[0][1]).toMatchObject({ id: 'exports/report.txt' })
  })
})
