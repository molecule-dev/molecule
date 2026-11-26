/**
 * The route-level upload parser over real HTTP: a real Express app, real busboy and a storage
 * double that keeps the uploads contract (abort rejects the pending write, delete removes it).
 *
 * The case these exist for: a route mounted AFTER the app-wide body parser. When that parser
 * drained multipart bodies itself, such a route's own parser waited forever for a body already
 * read, so every upload route had to be mounted through a pre-body-parser hook.
 */
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { connect } from 'node:net'

import express from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-i18n', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue,
}))

import {
  DEFAULT_MAX_FILE_BYTES,
  getParsedUploads,
  setUploadParserFactory,
  type StoredUpload,
  type UploadParserOptions,
  type UploadStorage,
} from '@molecule/api-middleware-body-parser'
import type { UploadedFile } from '@molecule/api-uploads'

import { provider } from '../provider.js'
import { acceptsType, formatByteLimit, uploadParserFactory } from '../upload-parser.js'

interface TestFile extends StoredUpload {
  fieldname: string
  mimetype: string
  size: number
  abort: () => void
}

/** Storage in memory: `stored` holds completed files, `events` the aborts and deletes. */
function memoryStorage(options: { failWrites?: boolean } = {}): {
  storage: UploadStorage<TestFile>
  stored: Map<string, Buffer>
  events: string[]
  started: TestFile[]
} {
  const stored = new Map<string, Buffer>()
  const events: string[] = []
  const started: TestFile[] = []
  const storage: UploadStorage<TestFile> = {
    upload(fieldname, stream, info, onError) {
      const chunks: Buffer[] = []
      let aborted = false
      let rejectWrite: (error: Error) => void = () => {}
      const file: TestFile = {
        id: randomUUID(),
        fieldname,
        mimetype: info.mimeType,
        size: 0,
        abort: () => {
          aborted = true
          rejectWrite(new Error('aborted'))
        },
      }
      file.uploadPromise = new Promise<void>((resolve, reject) => {
        rejectWrite = reject
        stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
          file.size += chunk.length
          if (options.failWrites) {
            const error = new Error('disk full')
            onError(error)
            reject(error)
          }
        })
        stream.on('end', () => {
          if (aborted || options.failWrites) return
          stored.set(file.id, Buffer.concat(chunks))
          resolve()
        })
      })
      // The parser observes the promise; this keeps a test's own rejection from going unhandled.
      file.uploadPromise.catch((_error: unknown) => undefined)
      started.push(file)
      return file
    },
    abortUpload(file) {
      events.push('abort')
      file.abort()
    },
    async deleteFile(id) {
      events.push('delete')
      stored.delete(id)
    },
  }
  return { storage, stored, events, started }
}

const servers: Array<{ close: () => void }> = []
const mockLogger = { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
afterEach(() => {
  for (const server of servers.splice(0)) server.close()
  vi.clearAllMocks()
})

/** Answers a failed request with its error, as an app's error handler does. */
const fail = (
  error: Error,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
): void => {
  res.status(500).json({ error: error.message })
}

/** Puts an app on a local port; the test's `afterEach` closes it. */
async function serve(server: express.Express, path = '/upload'): Promise<string> {
  const listening = server.listen(0, '127.0.0.1')
  await once(listening, 'listening')
  servers.push(listening)
  const { port } = listening.address() as AddressInfo
  return `http://127.0.0.1:${port}${path}`
}

/**
 * A running app: the app-wide body parser first, then the upload route, as a scaffold mounts
 * them. The handler answers with what it received, unless `respond` replaces it.
 */
async function app(
  options: Omit<UploadParserOptions<TestFile>, 'storage'>,
  storage: UploadStorage<TestFile>,
  before: express.RequestHandler[] = [],
  respond: express.RequestHandler = (req, res) => {
    const files = getParsedUploads<TestFile>(req, options.field)
    res.json({
      files: files.map((file) => ({ size: file.size, mimetype: file.mimetype })),
      body: req.body,
    })
  },
): Promise<{ url: string; handled: () => number }> {
  let handled = 0
  const server = express()
  server.use(provider as express.RequestHandler)
  server.post(
    '/upload',
    ...before,
    uploadParserFactory({ ...options, storage: () => storage }) as express.RequestHandler,
    (_req, _res, next) => {
      handled += 1
      next()
    },
    respond,
  )
  server.use(fail)
  return { url: await serve(server), handled: () => handled }
}

/** A complete multipart request with one `photo` file, as the bytes for a socket to send. */
const multipart = (port: string, boundary: string, file: string): string => {
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="photo"; filename="a.png"',
    'Content-Type: image/png',
    '',
    file,
    `--${boundary}--`,
    '',
  ].join('\r\n')
  return [
    'POST /upload HTTP/1.1',
    `Host: 127.0.0.1:${port}`,
    `Content-Type: multipart/form-data; boundary=${boundary}`,
    `Content-Length: ${Buffer.byteLength(body)}`,
    '',
    body,
  ].join('\r\n')
}

const form = (parts: Array<[string, string | Blob, string?]>): FormData => {
  const data = new FormData()
  for (const [name, value, filename] of parts)
    if (typeof value === 'string') data.append(name, value)
    else data.append(name, value, filename)
  return data
}

const png = (bytes: number): Blob => new Blob([new Uint8Array(bytes)], { type: 'image/png' })

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50))

describe('uploadParserFactory', () => {
  const photo = { field: 'photo', maxFileBytes: 1024, types: ['image/png', 'image/jpeg'] }

  it('stores an accepted file and passes its text fields, mounted after the app-wide parser', async () => {
    const { storage, stored } = memoryStorage()
    const { url } = await app(photo, storage)
    const res = await fetch(url, {
      method: 'POST',
      body: form([
        ['caption', 'a cat'],
        ['photo', png(512), 'cat.png'],
      ]),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      files: [{ size: 512, mimetype: 'image/png' }],
      body: { caption: 'a cat' },
    })
    expect([...stored.values()].map((bytes) => bytes.length)).toEqual([512])
  })

  it('refuses a file over the limit with 413 and keeps nothing', async () => {
    const { storage, stored, started } = memoryStorage()
    const { url, handled } = await app(photo, storage)
    const res = await fetch(url, { method: 'POST', body: form([['photo', png(4096), 'big.png']]) })
    expect(res.status).toBe(413)
    expect(await res.json()).toMatchObject({ errorKey: 'middleware.error.fileTooLarge' })
    await settle()
    expect(started).toHaveLength(1)
    expect(stored.size).toBe(0)
    expect(handled()).toBe(0)
  })

  // Upload security review (2026-11-25), finding 6: busboy reports the limit when a size reaches it,
  // so a file of exactly maxFileBytes was refused as too large. The limit is the largest accepted size.
  it('accepts a file of exactly the size limit, and refuses one byte more (OLD MUSTFAIL)', async () => {
    const { storage, stored } = memoryStorage()
    const { url } = await app(photo, storage)
    const atLimit = await fetch(url, {
      method: 'POST',
      body: form([['photo', png(1024), 'exact.png']]),
    })
    expect(atLimit.status).toBe(200)
    expect(await atLimit.json()).toMatchObject({ files: [{ size: 1024 }] })
    expect([...stored.values()].map((bytes) => bytes.length)).toEqual([1024])

    const over = await fetch(url, {
      method: 'POST',
      body: form([['photo', png(1025), 'over.png']]),
    })
    expect(over.status).toBe(413)
    expect(await over.json()).toMatchObject({ errorKey: 'middleware.error.fileTooLarge' })
  })

  it('accepts a text field of exactly the size limit, and refuses one byte more (OLD MUSTFAIL)', async () => {
    const { storage } = memoryStorage()
    const { url } = await app({ ...photo, maxFieldBytes: 1024 }, storage)
    const atLimit = await fetch(url, {
      method: 'POST',
      body: form([
        ['caption', 'x'.repeat(1024)],
        ['photo', png(10), 'a.png'],
      ]),
    })
    expect(atLimit.status).toBe(200)
    expect(await atLimit.json()).toMatchObject({ body: { caption: 'x'.repeat(1024) } })

    const over = await fetch(url, {
      method: 'POST',
      body: form([
        ['caption', 'x'.repeat(1025)],
        ['photo', png(10), 'a.png'],
      ]),
    })
    expect(over.status).toBe(413)
    expect(await over.json()).toMatchObject({ errorKey: 'middleware.error.payloadTooLarge' })
  })

  it('still refuses a file past the default cap by one byte', async () => {
    const { storage } = memoryStorage()
    const { url } = await app({ field: 'photo' }, storage)
    const over = await fetch(url, {
      method: 'POST',
      body: form([['photo', png(DEFAULT_MAX_FILE_BYTES + 2), 'big.png']]),
    })
    expect(over.status).toBe(413)
  })

  it('caps a route that names no size at the 10 MiB default (OLD MUSTFAIL)', async () => {
    const { storage, stored } = memoryStorage()
    const { url } = await app({ field: 'photo' }, storage)
    expect(DEFAULT_MAX_FILE_BYTES).toBe(10 * 1024 * 1024)
    const small = await fetch(url, { method: 'POST', body: form([['photo', png(4096), 'ok.png']]) })
    expect(small.status).toBe(200)
    const big = await fetch(url, {
      method: 'POST',
      body: form([['photo', png(DEFAULT_MAX_FILE_BYTES + 1), 'big.png']]),
    })
    expect(big.status).toBe(413)
    expect(await big.json()).toMatchObject({
      errorKey: 'middleware.error.fileTooLarge',
      error: 'The file is larger than 10 MB.',
    })
    await settle()
    expect([...stored.values()].map((bytes) => bytes.length)).toEqual([4096])
  })

  it('refuses a type the route does not accept with 415 before storing anything', async () => {
    const { storage, started } = memoryStorage()
    const { url, handled } = await app(photo, storage)
    const html = new Blob(['<script>'], { type: 'text/html' })
    const res = await fetch(url, { method: 'POST', body: form([['photo', html, 'x.html']]) })
    expect(res.status).toBe(415)
    expect(await res.json()).toMatchObject({ errorKey: 'middleware.error.fileTypeNotAllowed' })
    expect(started).toHaveLength(0)
    expect(handled()).toBe(0)
  })

  it('refuses a request with no file with 400, unless the file is optional', async () => {
    const { storage } = memoryStorage()
    const required = await app(photo, storage)
    const res = await fetch(required.url, { method: 'POST', body: form([['caption', 'none']]) })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ errorKey: 'middleware.error.fileMissing' })

    const optional = await app({ ...photo, required: false }, storage)
    const ok = await fetch(optional.url, { method: 'POST', body: form([['caption', 'none']]) })
    expect(await ok.json()).toEqual({ files: [], body: { caption: 'none' } })
  })

  it('refuses a file in another field with 400', async () => {
    const { storage, started } = memoryStorage()
    const { url } = await app(photo, storage)
    const res = await fetch(url, { method: 'POST', body: form([['avatar', png(10), 'a.png']]) })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ errorKey: 'middleware.error.unexpectedFile' })
    expect(started).toHaveLength(0)
  })

  it('refuses a file in another field with 400 after an accepted one, removing it (OLD MUSTFAIL)', async () => {
    // The file limit counts the route's field only: busboy's own limit counted every file part,
    // so the second file, in "avatar", was answered 413 before its field was read.
    const { storage, stored } = memoryStorage()
    const { url, handled } = await app(photo, storage)
    const res = await fetch(url, {
      method: 'POST',
      body: form([
        ['photo', png(10), 'a.png'],
        ['avatar', png(10), 'b.png'],
      ]),
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ errorKey: 'middleware.error.unexpectedFile' })
    await settle()
    expect(stored.size).toBe(0)
    expect(handled()).toBe(0)
  })

  it('refuses more files than the route accepts with 413 and removes the ones stored', async () => {
    const { storage, stored } = memoryStorage()
    const { url, handled } = await app(photo, storage)
    const res = await fetch(url, {
      method: 'POST',
      body: form([
        ['photo', png(10), 'a.png'],
        ['photo', png(10), 'b.png'],
      ]),
    })
    expect(res.status).toBe(413)
    expect(await res.json()).toMatchObject({ errorKey: 'middleware.error.tooManyFiles' })
    await settle()
    expect(stored.size).toBe(0)
    expect(handled()).toBe(0)
  })

  it('refuses a body that is not multipart with 415', async () => {
    const { storage } = memoryStorage()
    const { url } = await app(photo, storage)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
    expect(res.status).toBe(415)
    expect(await res.json()).toMatchObject({ errorKey: 'middleware.error.notMultipart' })
  })

  it('passes a storage failure to the error handler and keeps nothing', async () => {
    const { storage, stored } = memoryStorage({ failWrites: true })
    const { url, handled } = await app(photo, storage)
    const res = await fetch(url, { method: 'POST', body: form([['photo', png(100), 'a.png']]) })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'disk full' })
    expect(stored.size).toBe(0)
    expect(handled()).toBe(0)
  })

  // r20 harness eval (2026-11-24): the filesystem provider refused a text/html file through
  // onError, the parser passed it on as a server error, and the client got Express's HTML 500
  // page with a stack trace instead of a 415.
  it('answers a storage refusal with its status and message, and keeps nothing (OLD MUSTFAIL)', async () => {
    const { storage, stored } = memoryStorage()
    const refusing: UploadStorage<TestFile> = {
      ...storage,
      upload(fieldname, stream, info, onError) {
        stream.resume()
        const refusal = Object.assign(new Error('Files of type text/html cannot be uploaded.'), {
          status: 415,
          errorKey: 'uploads.error.fileTypeBlocked',
          values: { type: 'text/html' },
        })
        onError(refusal)
        return { id: randomUUID(), fieldname, mimetype: info.mimeType, size: 0, abort: () => {} }
      },
    }
    const { url, handled } = await app({ field: 'photo' }, refusing)
    const html = new Blob(['<script>'], { type: 'text/html' })
    const res = await fetch(url, { method: 'POST', body: form([['photo', html, 'x.html']]) })
    expect(res.status).toBe(415)
    expect(await res.json()).toEqual({
      error: 'Files of type text/html cannot be uploaded.',
      errorKey: 'uploads.error.fileTypeBlocked',
    })
    expect(stored.size).toBe(0)
    expect(handled()).toBe(0)
  })

  // Counterexample: an error that only looks like one (a 5xx status) is still the server's.
  it('passes a storage error with a 5xx status to the error handler', async () => {
    const { storage } = memoryStorage()
    const failing: UploadStorage<TestFile> = {
      ...storage,
      upload(fieldname, stream, info, onError) {
        stream.resume()
        onError(Object.assign(new Error('bucket unavailable'), { status: 503, errorKey: 'x' }))
        return { id: randomUUID(), fieldname, mimetype: info.mimeType, size: 0, abort: () => {} }
      },
    }
    const { url } = await app({ field: 'photo' }, failing)
    const res = await fetch(url, { method: 'POST', body: form([['photo', png(10), 'a.png']]) })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'bucket unavailable' })
  })

  it('answers instead of hanging when another parser read the body first', async () => {
    const { storage } = memoryStorage()
    const { url } = await app(photo, storage, [express.raw({ type: 'multipart/form-data' })])
    const res = await fetch(url, { method: 'POST', body: form([['photo', png(10), 'a.png']]) })
    expect(res.status).toBe(500)
    expect((await res.json()) as { error: string }).toMatchObject({
      error: expect.stringContaining('already read'),
    })
  })

  it('removes the partial file when the client disconnects mid-upload', async () => {
    const { storage, stored, events, started } = memoryStorage()
    const { url, handled } = await app({ ...photo, maxFileBytes: 1024 * 1024 }, storage)
    const { port } = new URL(url)
    const socket = connect(Number(port), '127.0.0.1')
    await once(socket, 'connect')
    const boundary = 'b0undary'
    socket.write(
      [
        'POST /upload HTTP/1.1',
        `Host: 127.0.0.1:${port}`,
        `Content-Type: multipart/form-data; boundary=${boundary}`,
        'Content-Length: 100000',
        '',
        `--${boundary}`,
        'Content-Disposition: form-data; name="photo"; filename="a.png"',
        'Content-Type: image/png',
        '',
        'x'.repeat(2000),
      ].join('\r\n'),
    )
    await vi.waitFor(() => expect(started).toHaveLength(1))
    socket.destroy()
    await vi.waitFor(() => expect(events).toContain('abort'))
    expect(stored.size).toBe(0)
    expect(handled()).toBe(0)
  })
})

// Upload security review (2026-11-25), finding 2: the parser stopped owning a request's files when it
// called next(), so a handler that failed after the upload left them stored, with nothing pointing
// at them. It now keeps owning them until the route has answered.
describe('a route that fails after the upload', () => {
  const route = { field: 'photo', maxFileBytes: 1024, types: ['image/png', 'image/jpeg'] }
  const upload = (url: string, init: RequestInit = {}): Promise<Response> =>
    fetch(url, { method: 'POST', body: form([['photo', png(300), 'cat.png']]), ...init })

  it('removes the file when the handler throws (OLD MUSTFAIL)', async () => {
    const { storage, stored } = memoryStorage()
    const { url, handled } = await app(route, storage, [], async () => {
      throw new Error('database write failed')
    })
    const res = await upload(url)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'database write failed' })
    expect(handled()).toBe(1)
    await vi.waitFor(() => expect(stored.size).toBe(0))
  })

  it('removes the file when the handler answers 422 (OLD MUSTFAIL)', async () => {
    const { storage, stored, events } = memoryStorage()
    const { url } = await app(route, storage, [], (_req, res) => {
      res.status(422).json({ error: 'caption is required' })
    })
    const res = await upload(url)
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ error: 'caption is required' })
    await vi.waitFor(() => expect(stored.size).toBe(0))
    // The file was complete, so it was removed, not aborted.
    expect(events).toEqual(['delete'])
  })

  it('removes the file when the handler answers 500', async () => {
    const { storage, stored } = memoryStorage()
    const { url } = await app(route, storage, [], (_req, res) => {
      res.status(500).json({ error: 'row write failed' })
    })
    const res = await upload(url)
    expect(res.status).toBe(500)
    await vi.waitFor(() => expect(stored.size).toBe(0))
  })

  it('removes every file, from a route that takes several', async () => {
    const { storage, stored } = memoryStorage()
    const { url } = await app({ ...route, maxFiles: 3 }, storage, [], (_req, res) => {
      res.status(400).end()
    })
    const res = await fetch(url, {
      method: 'POST',
      body: form([
        ['photo', png(10), 'a.png'],
        ['photo', png(20), 'b.png'],
        ['photo', png(30), 'c.png'],
      ]),
    })
    expect(res.status).toBe(400)
    await vi.waitFor(() => expect(stored.size).toBe(0))
  })

  // A client that goes away is not a failed request: the handler may already have saved a row that
  // points at the file, so removing it would lose a stored upload.
  it('keeps the file when the client goes away before the handler answers', async () => {
    const { storage, stored, events } = memoryStorage()
    const { url, handled } = await app(route, storage, [], () => {
      // A handler that never answers: it waits on something slow.
    })
    const { port } = new URL(url)
    const socket = connect(Number(port), '127.0.0.1')
    await once(socket, 'connect')
    socket.write(multipart(port, 'b0undary', 'x'.repeat(300)))
    await vi.waitFor(() => expect(handled()).toBe(1))
    expect(stored.size).toBe(1)
    socket.destroy()
    await settle()
    expect(stored.size).toBe(1)
    expect(events).not.toContain('delete')
  })

  // Counterexample: a route that takes the file keeps it.
  it('keeps the file when the handler answers 201, or redirects', async () => {
    const { storage, stored } = memoryStorage()
    const created = await app(route, storage, [], (_req, res) => {
      res.status(201).json({ ok: true })
    })
    expect((await upload(created.url)).status).toBe(201)
    const redirected = await app(route, storage, [], (_req, res) => {
      res.redirect(303, '/done')
    })
    expect((await upload(redirected.url, { redirect: 'manual' })).status).toBe(303)
    await settle()
    expect(stored.size).toBe(2)
  })

  // The removal must be harmless when the handler already discarded the files itself: the real
  // receiveUploads() and discardUploads(), over a storage that refuses to remove a file it no longer
  // has, as the filesystem bond does (ENOENT).
  it('does not remove them again when the handler already called discardUploads()', async () => {
    const { storage: memory, stored } = memoryStorage()
    const deletes: string[] = []
    const storage: UploadStorage<TestFile> = {
      ...memory,
      async deleteFile(id) {
        deletes.push(id)
        if (!stored.has(id))
          throw Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' })
        await memory.deleteFile(id)
      },
    }
    const { bond, unbond } = await import('@molecule/api-bond')
    const { discardUploads, receiveUploads, setProvider } = await import('@molecule/api-uploads')
    bond('logger', mockLogger)
    setUploadParserFactory(uploadParserFactory)
    try {
      // The double stands in for the bonded provider. Its file records lack the name and type
      // fields of a real upload record, which nothing on this path reads, and the parser passes
      // the very object `upload()` returned back to `abortUpload`; they are typed as full records.
      type StoredRecord = TestFile & UploadedFile
      setProvider({
        upload: (fieldname, stream, info, onError) =>
          storage.upload(fieldname, stream, info, onError) as StoredRecord,
        abortUpload: (file) => storage.abortUpload(file as StoredRecord),
        deleteFile: storage.deleteFile,
      })
      const server = express()
      server.use(provider as express.RequestHandler)
      server.post(
        '/upload',
        receiveUploads({ field: 'photo' }) as express.RequestHandler,
        async (req, res) => {
          await discardUploads(req)
          res.status(500).json({ error: 'row write failed' })
        },
      )
      server.use(fail)
      const url = await serve(server)

      const res = await upload(url)
      expect(res.status).toBe(500)
      expect(await res.json()).toEqual({ error: 'row write failed' })
      await vi.waitFor(() => expect(stored.size).toBe(0))
      // The response is long gone and nothing was logged: one removal, no second attempt.
      await settle()
      expect(deletes).toHaveLength(1)
      expect(mockLogger.warn).not.toHaveBeenCalled()
      expect(mockLogger.error).not.toHaveBeenCalled()
    } finally {
      unbond('logger')
    }
  })
})

// r19 harness eval (2026-11-24): a body that ended inside the file part, with no closing boundary,
// ended the API process (busboy errors the file stream, which had no listener).
describe('a body that ends inside a file part', () => {
  for (const field of ['photo', 'other']) {
    it(`answers 400 and keeps nothing, with the file in ${field === 'photo' ? 'the route' : 'another'} field (OLD MUSTFAIL)`, async () => {
      const { storage, stored } = memoryStorage()
      const options = { field: 'photo', maxFileBytes: 1024 * 1024, types: ['image/png'] }
      const { url, handled } = await app(options, storage)
      const boundary = 'b0undary'
      const body = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="${field}"; filename="a.png"`,
        'Content-Type: image/png',
        '',
        'x'.repeat(2000),
      ].join('\r\n')
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
        body,
      })
      expect(res.status).toBe(400)
      await settle()
      expect(stored.size).toBe(0)
      expect(handled()).toBe(0)
      // The server still answers.
      const next = await fetch(url, { method: 'POST', body: form([['photo', png(10), 'b.png']]) })
      expect(next.status).toBe(200)
    })
  }
})

describe('a storage that ignores the abort contract', () => {
  it('still removes the partial file instead of waiting on it forever', async () => {
    const events: string[] = []
    const storage: UploadStorage<TestFile> = {
      upload(fieldname, stream, info) {
        stream.resume()
        // A write that never settles: no end, no rejection on abort.
        const file = { id: 'pending', fieldname, mimetype: info.mimeType, size: 0, abort: () => {} }
        return { ...file, uploadPromise: new Promise<void>(() => {}) }
      },
      abortUpload() {
        events.push('abort')
      },
      async deleteFile() {
        events.push('delete')
      },
    }
    const { url } = await app({ field: 'photo', maxFileBytes: 1024 * 1024 }, storage)
    const { port } = new URL(url)
    const socket = connect(Number(port), '127.0.0.1')
    await once(socket, 'connect')
    socket.write(
      [
        'POST /upload HTTP/1.1',
        `Host: 127.0.0.1:${port}`,
        'Content-Type: multipart/form-data; boundary=b',
        'Content-Length: 100000',
        '',
        '--b',
        'Content-Disposition: form-data; name="photo"; filename="a.png"',
        'Content-Type: image/png',
        '',
        'x'.repeat(2000),
      ].join('\r\n'),
    )
    await settle()
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    try {
      socket.destroy()
      await new Promise((resolve) => setImmediate(resolve))
      await new Promise((resolve) => setImmediate(resolve))
      expect(events).toEqual(['abort'])
      await vi.advanceTimersByTimeAsync(5000)
    } finally {
      vi.useRealTimers()
    }
    await vi.waitFor(() => expect(events).toEqual(['abort', 'delete']))
  })
})

describe('busboy read directly', () => {
  it('refuses a multipart body without a boundary with 400, storing nothing (OLD MUSTFAIL)', async () => {
    // connect-busboy built the parser outside any handler, so its throw reached the error handler.
    const { storage, started } = memoryStorage()
    const { url, handled } = await app({ field: 'photo' }, storage)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data' },
      body: 'x',
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ errorKey: 'middleware.error.badRequest' })
    expect(started).toHaveLength(0)
    expect(handled()).toBe(0)
  })

  it('passes an empty URL-encoded form with an empty body (OLD MUSTFAIL)', async () => {
    // connect-busboy skipped a body with no length, so the form parser found no parser and refused.
    const server = express()
    server.use(provider as express.RequestHandler)
    server.post('/form', (req, res) => res.json({ body: req.body }))
    const listening = server.listen(0, '127.0.0.1')
    await once(listening, 'listening')
    servers.push(listening)
    const { port } = listening.address() as AddressInfo
    const empty = await fetch(`http://127.0.0.1:${port}/form`, {
      method: 'POST',
      body: new URLSearchParams(),
    })
    expect(empty.status).toBe(200)
    expect(await empty.json()).toEqual({ body: {} })
    // Counterexample: a filled form still parses its fields.
    const filled = await fetch(`http://127.0.0.1:${port}/form`, {
      method: 'POST',
      body: new URLSearchParams({ name: 'Ada', count: '3' }),
    })
    expect(await filled.json()).toEqual({ body: { name: 'Ada', count: 3 } })
  })
})

describe('acceptsType', () => {
  it('matches exact types and families, ignoring case and parameters', () => {
    expect(acceptsType(['image/*'], 'image/webp')).toBe(true)
    expect(acceptsType(['image/png'], 'IMAGE/PNG; q=1')).toBe(true)
    expect(acceptsType(['image/png'], 'image/pngx')).toBe(false)
    expect(acceptsType(['image/*'], 'application/pdf')).toBe(false)
    expect(acceptsType(undefined, 'anything/else')).toBe(true)
  })
})

describe('formatByteLimit', () => {
  it('reads like a limit', () => {
    expect(formatByteLimit(5 * 1024 * 1024)).toBe('5 MB')
    expect(formatByteLimit(1536)).toBe('1.5 KB')
    expect(formatByteLimit(10)).toBe('10 B')
  })
})
