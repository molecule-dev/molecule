import { PassThrough, Readable, Writable } from 'node:stream'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const trackBondFailure = vi.fn()
vi.mock('@molecule/api-analytics', () => ({
  trackBondFailure: (...args: unknown[]) => trackBondFailure(...args),
}))

import type { UploadedFile, UploadProvider } from '@molecule/api-uploads'
import { UploadAbortedError } from '@molecule/api-uploads'

import { encodeMirrorId } from '../id.js'
import { createProvider } from '../provider.js'

interface FakeOptions {
  failUpload?: Error
  /** Delay (ms) per chunk written, to simulate a slow store. */
  delayMs?: number
  getThrows?: Error
  deleteThrows?: Error
  withHead?: boolean
  highWaterMark?: number
}

interface Fake extends UploadProvider {
  store: Map<string, Buffer>
  aborted: string[]
  deleted: string[]
  maxBuffered: number
  headFile?: (id: string) => Promise<{ bytes: number } | null>
}

let counter = 0

const fake = (name: string, options: FakeOptions = {}): Fake => {
  const store = new Map<string, Buffer>()
  const self: Fake = {
    store,
    aborted: [],
    deleted: [],
    maxBuffered: 0,
    upload(fieldname, stream, info, onError) {
      const id = `${name}-${++counter}`
      const chunks: Buffer[] = []
      let abort: (() => void) | undefined
      const uploadPromise = new Promise<void>((resolve, reject) => {
        let isAborted = false
        abort = () => {
          isAborted = true
          ;(stream as PassThrough).unpipe?.()
          reject(new UploadAbortedError())
        }
        const sink = new Writable({
          highWaterMark: options.highWaterMark ?? 16,
          write(chunk: Buffer, _enc, cb) {
            if (isAborted) return cb()
            if (options.failUpload) {
              const error = options.failUpload
              onError(error)
              reject(error)
              return cb(error)
            }
            const branch = stream as PassThrough
            self.maxBuffered = Math.max(self.maxBuffered, branch.readableLength ?? 0)
            chunks.push(Buffer.from(chunk))
            if (options.delayMs) setTimeout(cb, options.delayMs)
            else cb()
          },
          final(cb) {
            if (!isAborted) {
              store.set(id, Buffer.concat(chunks))
              resolve()
            }
            cb()
          },
        })
        sink.on('error', () => {
          // already reported above
        })
        stream.pipe(sink)
      })
      uploadPromise.catch(() => undefined)
      const file: UploadedFile & { abort?: () => void } = {
        id,
        fieldname,
        filename: info.filename,
        encoding: info.encoding,
        mimetype: info.mimeType,
        size: 0,
        uploadPromise,
        uploaded: false,
        abort: () => abort?.(),
      }
      return file
    },
    async abortUpload(file) {
      self.aborted.push(file.id)
      ;(file as { abort?: () => void }).abort?.()
    },
    async deleteFile(id) {
      if (options.deleteThrows) throw options.deleteThrows
      self.deleted.push(id)
      store.delete(id)
    },
    async getFile(id) {
      if (options.getThrows) throw options.getThrows
      const data = store.get(id)
      return data ? Readable.from([data]) : null
    },
  }
  if (options.withHead) {
    self.headFile = async (id) => (store.has(id) ? { bytes: store.get(id)!.length } : null)
  }
  return self
}

const info = { filename: 'a.bin', encoding: 'binary', mimeType: 'application/octet-stream' }

const readAll = async (stream: NodeJS.ReadableStream): Promise<Buffer> => {
  const chunks: Buffer[] = []
  for await (const chunk of stream as AsyncIterable<Buffer>) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

const chunksOf = (count: number, size: number): Buffer[] =>
  Array.from({ length: count }, (_v, index) => Buffer.alloc(size, index % 251))

beforeEach(() => {
  trackBondFailure.mockReset()
})

describe('upload', () => {
  it('tees identical bytes to every target for a multi-chunk stream', async () => {
    const a = fake('a')
    const b = fake('b')
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: a },
        { name: 'b', provider: b },
      ],
    })
    const chunks = chunksOf(20, 1000)
    const onError = vi.fn()
    const file = mirror.upload('f', Readable.from(chunks), info, onError)
    await file.uploadPromise
    const expected = Buffer.concat(chunks)
    const copies = mirror.parseId(file.id)!
    expect(copies.map((copy) => copy.target)).toEqual(['a', 'b'])
    expect(a.store.get(copies[0].id)).toEqual(expected)
    expect(b.store.get(copies[1].id)).toEqual(expected)
    expect(file.uploaded).toBe(true)
    expect(file.size).toBe(expected.length)
    expect(onError).not.toHaveBeenCalled()
  })

  it('a required target failure rejects, deletes the other copy, and calls onError', async () => {
    const a = fake('a')
    const boom = new Error('b is down')
    const b = fake('b', { failUpload: boom })
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: a },
        { name: 'b', provider: b },
      ],
    })
    const onError = vi.fn()
    const file = mirror.upload('f', Readable.from(chunksOf(5, 100)), info, onError)
    await expect(file.uploadPromise).rejects.toBe(boom)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(boom)
    expect(a.deleted).toHaveLength(1)
    expect(a.store.size).toBe(0)
  })

  it('an optional target failure succeeds with one copy and is reported', async () => {
    const a = fake('a')
    const boom = new Error('b is down')
    const b = fake('b', { failUpload: boom })
    const onTargetFailure = vi.fn()
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: a },
        { name: 'b', provider: b, required: false },
      ],
      onTargetFailure,
    })
    const onError = vi.fn()
    const file = mirror.upload('f', Readable.from(chunksOf(5, 100)), info, onError)
    await file.uploadPromise
    expect(onError).not.toHaveBeenCalled()
    expect(mirror.parseId(file.id)!.map((copy) => copy.target)).toEqual(['a'])
    expect(onTargetFailure).toHaveBeenCalledWith({ target: 'b', operation: 'upload', error: boom })
    expect(trackBondFailure).toHaveBeenCalledWith({
      bond: 'uploads-mirror',
      operation: 'upload',
      error: boom,
    })
    expect(a.deleted).toHaveLength(0)
  })

  it('fails when no target stored a copy, even if all were optional', async () => {
    const boom = new Error('down')
    const mirror = createProvider({
      targets: [{ name: 'a', provider: fake('a', { failUpload: boom }), required: false }],
    })
    const onError = vi.fn()
    const file = mirror.upload('f', Readable.from(chunksOf(2, 10)), info, onError)
    await expect(file.uploadPromise).rejects.toBe(boom)
    expect(onError).toHaveBeenCalledWith(boom)
  })

  it('applies backpressure: a slow target keeps the source from running ahead', async () => {
    const fast = fake('fast')
    const slow = fake('slow', { delayMs: 1 })
    const mirror = createProvider({
      targets: [
        { name: 'fast', provider: fast },
        { name: 'slow', provider: slow },
      ],
    })
    const chunk = 1024
    const total = 1000
    let produced = 0
    let maxLead = 0
    const source = new Readable({
      highWaterMark: chunk,
      read() {
        if (produced >= total) {
          this.push(null)
          return
        }
        produced++
        maxLead = Math.max(maxLead, produced - slowChunks)
        this.push(Buffer.alloc(chunk, 1))
      },
    })
    let slowChunks = 0
    const originalUpload = slow.upload.bind(slow)
    slow.upload = (fieldname, stream, fileInfo, onError) => {
      ;(stream as PassThrough).on('data', () => slowChunks++)
      return originalUpload(fieldname, stream, fileInfo, onError)
    }
    const file = mirror.upload('f', source, info, vi.fn())
    await file.uploadPromise
    const copies = mirror.parseId(file.id)!
    expect(slow.store.get(copies[1].id)!.length).toBe(chunk * total)
    // Without backpressure the fast target would drain the whole 1000-chunk source
    // up front. With it, the source stays within a constant window of the slow
    // target: one branch's PassThrough buffers (writable + readable highWaterMark)
    // plus the source's own buffer.
    const branchWindow = (2 * new PassThrough().readableHighWaterMark) / chunk
    expect(maxLead).toBeLessThanOrEqual(branchWindow + 8)
    expect(maxLead).toBeLessThan(total / 2)
    expect(slow.maxBuffered).toBeLessThanOrEqual(2 * new PassThrough().readableHighWaterMark)
  })

  it('abortUpload aborts every target and rejects with UploadAbortedError without onError', async () => {
    const a = fake('a', { delayMs: 5 })
    const b = fake('b', { delayMs: 5 })
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: a },
        { name: 'b', provider: b },
      ],
    })
    const onError = vi.fn()
    const source = new PassThrough()
    const file = mirror.upload('f', source, info, onError)
    source.write(Buffer.alloc(10))
    await mirror.abortUpload(file)
    source.end()
    await expect(file.uploadPromise).rejects.toBeInstanceOf(UploadAbortedError)
    expect(a.aborted).toHaveLength(1)
    expect(b.aborted).toHaveLength(1)
    expect(onError).not.toHaveBeenCalled()
  })
})

describe('getFile', () => {
  const idFor = (copies: Array<[string, string]>): string =>
    encodeMirrorId(copies.map(([target, id]) => ({ target, id })))

  it('prefers config order over id order', async () => {
    const a = fake('a')
    const b = fake('b')
    a.store.set('x', Buffer.from('from-a'))
    b.store.set('y', Buffer.from('from-b'))
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: a },
        { name: 'b', provider: b },
      ],
    })
    const stream = await mirror.getFile(
      idFor([
        ['b', 'y'],
        ['a', 'x'],
      ]),
    )
    expect((await readAll(stream!)).toString()).toBe('from-a')
  })

  it('skips a missing copy', async () => {
    const a = fake('a')
    const b = fake('b')
    b.store.set('y', Buffer.from('from-b'))
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: a },
        { name: 'b', provider: b },
      ],
    })
    const stream = await mirror.getFile(
      idFor([
        ['a', 'x'],
        ['b', 'y'],
      ]),
    )
    expect((await readAll(stream!)).toString()).toBe('from-b')
  })

  it('falls through a throwing target and reports it', async () => {
    const boom = new Error('a outage')
    const a = fake('a', { getThrows: boom })
    const b = fake('b')
    b.store.set('y', Buffer.from('from-b'))
    const onTargetFailure = vi.fn()
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: a },
        { name: 'b', provider: b },
      ],
      onTargetFailure,
    })
    const stream = await mirror.getFile(
      idFor([
        ['a', 'x'],
        ['b', 'y'],
      ]),
    )
    expect((await readAll(stream!)).toString()).toBe('from-b')
    expect(onTargetFailure).toHaveBeenCalledWith({ target: 'a', operation: 'get', error: boom })
    expect(trackBondFailure).toHaveBeenCalledWith({
      bond: 'uploads-mirror',
      operation: 'get',
      error: boom,
    })
  })

  it('returns null only when every copy is missing', async () => {
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: fake('a') },
        { name: 'b', provider: fake('b') },
      ],
    })
    expect(
      await mirror.getFile(
        idFor([
          ['a', 'x'],
          ['b', 'y'],
        ]),
      ),
    ).toBeNull()
  })

  it('throws the first error when one target threw and none served', async () => {
    const boom = new Error('a outage')
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: fake('a', { getThrows: boom }) },
        { name: 'b', provider: fake('b') },
      ],
    })
    await expect(
      mirror.getFile(
        idFor([
          ['a', 'x'],
          ['b', 'y'],
        ]),
      ),
    ).rejects.toBe(boom)
  })

  it('reads a legacy raw id from the first target that has it', async () => {
    const a = fake('a')
    const b = fake('b')
    b.store.set('legacy-uuid', Buffer.from('old file'))
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: a },
        { name: 'b', provider: b },
      ],
    })
    const stream = await mirror.getFile('legacy-uuid')
    expect((await readAll(stream!)).toString()).toBe('old file')
    expect(await mirror.getFile('nowhere')).toBeNull()
  })
})

describe('deleteFile', () => {
  it('deletes every copy', async () => {
    const a = fake('a')
    const b = fake('b')
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: a },
        { name: 'b', provider: b },
      ],
    })
    const file = mirror.upload('f', Readable.from([Buffer.from('hi')]), info, vi.fn())
    await file.uploadPromise
    await mirror.deleteFile(file.id)
    expect(a.store.size).toBe(0)
    expect(b.store.size).toBe(0)
  })

  it('tries every target for a raw id', async () => {
    const a = fake('a')
    const b = fake('b')
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: a },
        { name: 'b', provider: b },
      ],
    })
    await mirror.deleteFile('raw')
    expect(a.deleted).toEqual(['raw'])
    expect(b.deleted).toEqual(['raw'])
  })

  it('reports an optional-target failure without throwing', async () => {
    const boom = new Error('b delete failed')
    const onTargetFailure = vi.fn()
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: fake('a') },
        { name: 'b', provider: fake('b', { deleteThrows: boom }), required: false },
      ],
      onTargetFailure,
    })
    await mirror.deleteFile(
      encodeMirrorId([
        { target: 'a', id: 'x' },
        { target: 'b', id: 'y' },
      ]),
    )
    expect(onTargetFailure).toHaveBeenCalledWith({ target: 'b', operation: 'delete', error: boom })
  })

  it('throws a required-target failure', async () => {
    const boom = new Error('a delete failed')
    const b = fake('b')
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: fake('a', { deleteThrows: boom }) },
        { name: 'b', provider: b },
      ],
    })
    await expect(
      mirror.deleteFile(
        encodeMirrorId([
          { target: 'a', id: 'x' },
          { target: 'b', id: 'y' },
        ]),
      ),
    ).rejects.toBe(boom)
    expect(b.deleted).toEqual(['y'])
  })
})

describe('parseId / isMirrorId', () => {
  const mirror = createProvider({ targets: [{ name: 'a', provider: fake('a') }] })

  it('round-trips', () => {
    const copies = [
      { target: 'a', id: 'nightly/123' },
      { target: 'b_2', id: 'x y/z' },
    ]
    const id = encodeMirrorId(copies)
    expect(id.startsWith('mir1.')).toBe(true)
    expect(id).toMatch(/^mir1\.[A-Za-z0-9_-]+$/)
    expect(mirror.parseId(id)).toEqual(copies)
    expect(mirror.isMirrorId(id)).toBe(true)
  })

  it.each([
    ['a raw uuid', '5f0c6c3e-1111-4222-8333-444455556666'],
    ['wrong prefix', 'mir2.' + Buffer.from('[["a","x"]]').toString('base64url')],
    ['not base64url', 'mir1.!!!'],
    ['not JSON', 'mir1.' + Buffer.from('nope').toString('base64url')],
    ['empty array', 'mir1.' + Buffer.from('[]').toString('base64url')],
    ['bad shape', 'mir1.' + Buffer.from('[["a"]]').toString('base64url')],
    ['bad name', 'mir1.' + Buffer.from('[["a b","x"]]').toString('base64url')],
    ['empty id', 'mir1.' + Buffer.from('[["a",""]]').toString('base64url')],
    ['duplicate target', 'mir1.' + Buffer.from('[["a","x"],["a","y"]]').toString('base64url')],
    ['bare prefix', 'mir1.'],
  ])('rejects %s', (_label, id) => {
    expect(mirror.parseId(id)).toBeNull()
    expect(mirror.isMirrorId(id)).toBe(false)
  })
})

describe('locate', () => {
  it('uses headFile when a target has one and says unknown otherwise', async () => {
    const a = fake('a', { withHead: true })
    const b = fake('b')
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: a },
        { name: 'b', provider: b },
      ],
    })
    const file = mirror.upload('f', Readable.from([Buffer.from('hi')]), info, vi.fn())
    await file.uploadPromise
    const [copyA, copyB] = mirror.parseId(file.id)!
    expect(await mirror.locate(file.id)).toEqual([
      { ...copyA, present: true },
      { ...copyB, present: 'unknown' },
    ])
    a.store.clear()
    expect((await mirror.locate(file.id))[0].present).toBe(false)
  })
})

describe('config validation', () => {
  it('rejects empty, duplicate and malformed target names', () => {
    expect(() => createProvider({ targets: [] })).toThrow()
    expect(() =>
      createProvider({
        targets: [
          { name: 'a', provider: fake('a') },
          { name: 'a', provider: fake('b') },
        ],
      }),
    ).toThrow(/duplicate/)
    expect(() => createProvider({ targets: [{ name: 'a.b', provider: fake('a') }] })).toThrow()
    expect(() =>
      createProvider({ targets: [{ name: 'x'.repeat(33), provider: fake('a') }] }),
    ).toThrow()
  })

  it('exposes targets with required defaulted', () => {
    const mirror = createProvider({
      targets: [
        { name: 'a', provider: fake('a') },
        { name: 'b', provider: fake('b'), required: false },
      ],
    })
    expect(mirror.targets).toEqual([
      { name: 'a', required: true },
      { name: 'b', required: false },
    ])
  })
})
