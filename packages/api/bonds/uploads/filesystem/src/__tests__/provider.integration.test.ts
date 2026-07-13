/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual node:fs + uuid.
 *
 * The unit suite (`index.test.ts`) mocks `fs` entirely, so it can only validate
 * OUR assumptions about the filesystem — not the filesystem. That gap let a
 * contract violation ship unfelt: `provider.getFile()` used to return
 * `fs.createReadStream(missingPath)` for a deleted/nonexistent file — a stream
 * that emits ENOENT *asynchronously* — instead of the `null` the GetFileHandler
 * contract promises. A consumer following the core docs
 * (`if (!stream) return 404; stream.pipe(res)`) would then crash the whole
 * process on an unhandled 'error' event (pipe does NOT forward errors) instead
 * of serving a 404. Every bond wrapping a pure-local dependency should carry a
 * file like this one; the unit mocks stay for shape/edge cases.
 *
 * @module
 */

import fs from 'node:fs'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { setTimeout as delay } from 'node:timers/promises'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'

/** Unique per-run scratch dir (relative — the provider joins it with cwd). */
const TMP_DIR = `.integration-uploads-${process.pid}`

/** Silent logger bond so expected-failure paths don't spam the test output. */
const silentLogger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

let mod: typeof ProviderModule

/** Reads an entire readable stream into a Buffer. */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk as Buffer))
  }
  return Buffer.concat(chunks)
}

beforeAll(async () => {
  // The provider resolves FILE_UPLOAD_PATH at module load — stub BEFORE importing.
  vi.stubEnv('FILE_UPLOAD_PATH', TMP_DIR)
  const { bond } = await import('@molecule/api-bond')
  bond('logger', silentLogger)
  mod = await import('../provider.js')
})

afterAll(async () => {
  const { unbond } = await import('@molecule/api-bond')
  unbond('logger')
  fs.rmSync(mod.uploadPath, { recursive: true, force: true })
  vi.unstubAllEnvs()
})

describe('@molecule/api-uploads-filesystem × REAL fs', () => {
  it('full lifecycle: upload → exact bytes on disk under the UUID → getFile streams them back → delete → getFile is null, re-delete is ENOENT', async () => {
    const source = new PassThrough()
    const onError = vi.fn()

    const file = mod.upload(
      'doc',
      source,
      { filename: 'hello.txt', encoding: '7bit', mimeType: 'text/plain' },
      onError,
    )

    // Real uuid — the storage key is server-generated, never the client filename.
    expect(file.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)

    source.write('hello ')
    source.write('world')
    source.end()
    await file.uploadPromise

    expect(file.uploaded).toBe(true)
    expect(file.size).toBe(11)
    expect(onError).not.toHaveBeenCalled()

    // The bytes landed on the real disk, keyed by UUID (not the client filename).
    expect(fs.readFileSync(path.join(mod.uploadPath, file.id), 'utf8')).toBe('hello world')
    expect(fs.existsSync(path.join(mod.uploadPath, 'hello.txt'))).toBe(false)

    // getFile streams back the identical bytes.
    const readStream = await mod.provider.getFile!(file.id)
    expect(readStream).not.toBeNull()
    expect((await streamToBuffer(readStream!)).toString('utf8')).toBe('hello world')

    // Delete, then FAILURE DISAMBIGUATION: a missing file is a quiet `null` from
    // getFile (the caller 404s — NOT an error-emitting stream that would crash an
    // unsuspecting `stream.pipe(res)`), while a second delete is a loud ENOENT.
    await mod.provider.deleteFile(file.id)
    await expect(mod.provider.getFile!(file.id)).resolves.toBeNull()
    await expect(mod.provider.deleteFile(file.id)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('CONSUMER PROPERTY: a slow, chunked upload (6 chunks over ~600ms) survives with intact bytes and accurate size accounting', async () => {
    // Real client uploads trickle in over time (slow links, big files). Nothing in
    // the provider may expire, time out, or drop chunks mid-flow.
    const source = new PassThrough()
    const onError = vi.fn()

    const file = mod.upload(
      'doc',
      source,
      { filename: 'slow.bin', encoding: 'binary', mimeType: 'application/octet-stream' },
      onError,
    )

    const chunk = Buffer.alloc(1024, 0x61)
    for (let i = 0; i < 6; i++) {
      source.write(chunk)
      await delay(100)
    }
    source.end()
    await file.uploadPromise

    expect(onError).not.toHaveBeenCalled()
    expect(file.uploaded).toBe(true)
    expect(file.size).toBe(6 * 1024)
    expect(fs.statSync(path.join(mod.uploadPath, file.id)).size).toBe(6 * 1024)

    await mod.provider.deleteFile(file.id)
  })

  it('FAILURE DISAMBIGUATION: traversal throws "Invalid file ID", a well-formed missing id resolves null — a caller can tell attack from absence', async () => {
    await expect(mod.provider.getFile!('../../../etc/passwd')).rejects.toThrow('Invalid file ID')
    await expect(mod.provider.deleteFile('../../../etc/passwd')).rejects.toThrow('Invalid file ID')

    // A legitimate-looking id that simply doesn't exist is NOT an error — it's null.
    await expect(mod.provider.getFile!('550e8400-e29b-41d4-a716-446655440000')).resolves.toBeNull()
  })

  it('blocked MIME type: onError names the offending type, nothing is written, and the rejected stream is drained so the multipart parser can finish', async () => {
    const source = new PassThrough()
    const onError = vi.fn()
    const entriesBefore = fs.readdirSync(mod.uploadPath).length

    const file = mod.upload(
      'doc',
      source,
      { filename: 'evil.html', encoding: '7bit', mimeType: 'text/html' },
      onError,
    )

    // The error is immediate and names the type — distinguishable from a size
    // limit ('Stream limit reached.') and from a write failure.
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('text/html') }),
    )
    expect(file.uploadPromise).toBeUndefined()

    // The source keeps flowing (drained) — an unconsumed busboy file stream would
    // stall the whole multipart request.
    expect(source.readableFlowing).toBe(true)
    source.write('<script>alert(1)</script>')
    source.end()
    await delay(20)

    // Nothing was written to disk.
    expect(fs.readdirSync(mod.uploadPath).length).toBe(entriesBefore)
  })

  it('abortUpload mid-stream removes the partially written file from disk', async () => {
    const source = new PassThrough()
    const onError = vi.fn()

    const file = mod.upload(
      'doc',
      source,
      { filename: 'partial.txt', encoding: '7bit', mimeType: 'text/plain' },
      onError,
    )

    source.write('partial data that should not persist')
    await delay(50) // let the real write stream open and flush

    const onDisk = path.join(mod.uploadPath, file.id)
    expect(fs.existsSync(onDisk)).toBe(true)

    mod.provider.abortUpload(file)

    // unlink is async inside abortUpload — poll deterministically until it lands.
    await vi.waitFor(() => {
      expect(fs.existsSync(onDisk)).toBe(false)
    })
  })
})
