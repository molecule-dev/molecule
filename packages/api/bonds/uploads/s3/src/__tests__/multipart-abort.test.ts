/**
 * An aborted S3 upload, against the real AWS SDK and a local stand-in for S3 that speaks multipart.
 *
 * Exercises the SDK's multipart cleanup and the ordering of an in-flight `PutObject` and deletion.
 *
 * @module
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { PassThrough } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { bond, unbond } from '@molecule/api-bond'
import { UploadAbortedError } from '@molecule/api-uploads'

import { createProvider, type S3UploadProvider } from '../provider.js'
import type { File } from '../types.js'

const mockLogger = { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }

/** One multipart upload the stand-in has open. */
interface OpenUpload {
  key: string
  parts: Map<number, Buffer>
}

/** The local S3: what it holds, what it was asked, and how to stop it. */
interface StandIn {
  url: string
  /** The objects stored, by key. */
  objects: Map<string, Buffer>
  /** The multipart uploads still open, by upload id. */
  open: Map<string, OpenUpload>
  /** What the stand-in did, in the order it did it. */
  events: string[]
  close(): Promise<void>
}

/** Reads a request's body. */
const bodyOf = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

/**
 * Starts a local S3 on a free port. It answers what the SDK's `Upload` sends for one object with
 * path-style addressing (`/bucket/key`): a single `PutObject`, a multipart upload's create, part,
 * complete and abort requests, `GetObject` and `DeleteObject`.
 *
 * @param options - `beforePutCommit` holds a `PutObject` open until the test releases it.
 * @returns The running stand-in.
 */
async function standIn(options: { beforePutCommit?: Promise<void> } = {}): Promise<StandIn> {
  const objects = new Map<string, Buffer>()
  const open = new Map<string, OpenUpload>()
  const events: string[] = []
  let created = 0

  const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const url = new URL(req.url ?? '/', 'http://s3.local')
    const [, bucket, ...rest] = url.pathname.split('/')
    const key = decodeURIComponent(rest.join('/'))
    const body = await bodyOf(req)
    const xml = (payload: string): void => {
      res.writeHead(200, { 'content-type': 'application/xml' })
      res.end(`<?xml version="1.0" encoding="UTF-8"?>${payload}`)
    }
    const uploadId = url.searchParams.get('uploadId')

    if (req.method === 'POST' && url.searchParams.has('uploads')) {
      created += 1
      const id = `upload-${created}`
      open.set(id, { key, parts: new Map() })
      events.push('create')
      xml(
        `<InitiateMultipartUploadResult><Bucket>${bucket}</Bucket><Key>${key}</Key>` +
          `<UploadId>${id}</UploadId></InitiateMultipartUploadResult>`,
      )
    } else if (req.method === 'PUT' && url.searchParams.has('partNumber')) {
      const number = Number(url.searchParams.get('partNumber'))
      open.get(uploadId ?? '')?.parts.set(number, body)
      events.push(`part:${number}`)
      res.writeHead(200, { etag: `"part-${number}"` })
      res.end()
    } else if (req.method === 'POST' && uploadId !== null) {
      const upload = open.get(uploadId)
      open.delete(uploadId)
      if (upload) {
        const numbers = [...upload.parts.keys()].sort((a, b) => a - b)
        objects.set(upload.key, Buffer.concat(numbers.map((part) => upload.parts.get(part)!)))
      }
      events.push('complete')
      xml(
        `<CompleteMultipartUploadResult><Location>${url.href}</Location>` +
          `<Bucket>${bucket}</Bucket><Key>${key}</Key><ETag>"complete"</ETag>` +
          '</CompleteMultipartUploadResult>',
      )
    } else if (req.method === 'DELETE' && uploadId !== null) {
      open.delete(uploadId)
      events.push('abort')
      res.writeHead(204)
      res.end()
    } else if (req.method === 'PUT') {
      events.push('put:received')
      if (options.beforePutCommit) await options.beforePutCommit
      objects.set(key, body)
      events.push('put:committed')
      res.writeHead(200, { etag: '"put"' })
      res.end()
    } else if (req.method === 'DELETE') {
      objects.delete(key)
      events.push('delete')
      res.writeHead(204)
      res.end()
    } else {
      const object = objects.get(key)
      events.push('get')
      if (!object) {
        res.writeHead(404, { 'content-type': 'application/xml' })
        res.end(
          '<?xml version="1.0" encoding="UTF-8"?>' +
            '<Error><Code>NoSuchKey</Code><Message>No such key</Message></Error>',
        )
      } else {
        res.writeHead(200, { 'content-length': String(object.length) })
        res.end(object)
      }
    }
  }

  const server = createServer((req, res) => {
    void handle(req, res).catch((error: unknown) => {
      events.push(`error: ${error instanceof Error ? error.message : String(error)}`)
      res.destroy()
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}`,
    objects,
    open,
    events,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}

const info = { filename: 'photo.bin', encoding: 'binary', mimeType: 'application/octet-stream' }

/** A store on the stand-in; it reads nothing from the environment. */
const storeOn = (url: string): S3UploadProvider =>
  createProvider({
    bucket: 'uploads',
    endpoint: url,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: { accessKeyId: 'testing', secretAccessKey: 'testing' },
  })

/** How long to let the SDK and the stand-in talk. */
const waitForIt = { timeout: 5000, interval: 25 }

describe('an aborted S3 upload', () => {
  let s3: StandIn
  let store: S3UploadProvider
  const sources: PassThrough[] = []

  beforeEach(async () => {
    vi.clearAllMocks()
    bond('logger', mockLogger)
    s3 = await standIn()
    store = storeOn(s3.url)
  })

  afterEach(async () => {
    for (const source of sources.splice(0)) source.destroy()
    await store.close?.()
    await s3.close()
    unbond('logger')
  })

  /** Starts an upload from a stream the test feeds. */
  const start = (): {
    file: File
    source: PassThrough
    uploadPromise: Promise<void>
    onError: ReturnType<typeof vi.fn>
  } => {
    const source = new PassThrough()
    sources.push(source)
    const onError = vi.fn()
    const file = store.upload('photo', source, info, onError)
    // Held here as a consumer holds it: the abort settles the promise through this reference.
    const uploadPromise = file.uploadPromise!
    void uploadPromise.catch((_error: unknown) => {
      // The abort tests assert the rejection after storage cleanup finishes.
    })
    return { file, source, uploadPromise, onError }
  }

  /** What the upload parser's cleanup does for a refused request: abort the write, then delete. */
  const abortThenDelete = async (file: File): Promise<void> => {
    await store.abortUpload(file)
    await store.deleteFile(file.id)
  }

  it('stores a file whole when it is not aborted (the stand-in speaks S3)', async () => {
    const { source, uploadPromise, onError } = start()
    source.end('hello')
    await uploadPromise
    expect(onError).not.toHaveBeenCalled()
    expect([...s3.objects.values()].map((object) => object.toString())).toEqual(['hello'])
    expect(s3.events).toEqual(['put:received', 'put:committed'])
  })

  it('leaves no open multipart upload once an upload past its first part is aborted', async () => {
    const { file, source, uploadPromise, onError } = start()
    // More than one 5 MiB part: the SDK has sent the first before the rest arrives.
    source.write(Buffer.alloc(5 * 1024 * 1024 + 1024, 1))
    await vi.waitFor(() => expect(s3.events).toContain('part:1'), waitForIt)

    await abortThenDelete(file)

    await expect(uploadPromise).rejects.toBeInstanceOf(UploadAbortedError)
    expect(onError).not.toHaveBeenCalled()
    expect(mockLogger.error).not.toHaveBeenCalled()
    expect(s3.open.size).toBe(0)
    expect(s3.objects.size).toBe(0)
    expect(s3.events).toEqual(['create', 'part:1', 'abort', 'delete'])
  })

  it('waits for an in-flight PutObject before deleting the aborted upload', async () => {
    await store.close?.()
    await s3.close()
    let commitPut!: () => void
    const beforePutCommit = new Promise<void>((resolve) => {
      commitPut = resolve
    })
    s3 = await standIn({ beforePutCommit })
    store = storeOn(s3.url)

    const { file, source, uploadPromise, onError } = start()
    // The whole file: the SDK sends one PutObject, which the stand-in holds before it stores it.
    source.end('hello')
    await vi.waitFor(() => expect(s3.events).toContain('put:received'), waitForIt)

    const abort = store.abortUpload(file)
    const abortSettledBeforePut = await Promise.race([
      abort.then(() => true),
      new Promise<false>((resolve) => setImmediate(() => resolve(false))),
    ])
    commitPut()
    await abort
    await store.deleteFile(file.id)

    expect(abortSettledBeforePut).toBe(false)
    await expect(uploadPromise).rejects.toBeInstanceOf(UploadAbortedError)
    expect(onError).not.toHaveBeenCalled()
    expect(mockLogger.error).not.toHaveBeenCalled()
    expect(s3.events).toEqual(['put:received', 'put:committed', 'delete'])
    expect(s3.objects.size).toBe(0)
  })

  it('has nothing to clean up when aborted before its first byte', async () => {
    const { file, uploadPromise, onError } = start()
    await abortThenDelete(file)

    await expect(uploadPromise).rejects.toBeInstanceOf(UploadAbortedError)
    expect(onError).not.toHaveBeenCalled()
    expect(s3.events).toEqual(['delete'])
    expect(s3.open.size).toBe(0)
    expect(s3.objects.size).toBe(0)
  })
})
