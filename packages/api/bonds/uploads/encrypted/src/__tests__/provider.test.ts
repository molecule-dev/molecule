import { randomBytes } from 'node:crypto'
import { PassThrough, Readable } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EncryptionProvider } from '@molecule/api-encryption'
import { setProvider as setEncryptionProvider } from '@molecule/api-encryption'
import { createProvider as createAesProvider } from '@molecule/api-encryption-aes'
import type { FileInfo, UploadedFile, UploadProvider } from '@molecule/api-uploads'

import { createProvider, encodeEncryptedId, parseEncryptedId } from '../provider.js'

const KEY = '00'.repeat(32)
const INFO: FileInfo = {
  filename: 'a.bin',
  encoding: 'binary',
  mimeType: 'application/octet-stream',
}
const CHUNK = 4096

/** In-memory upload provider that stores whatever bytes it is given. */
const createMemoryInner = (): UploadProvider & {
  store: Map<string, Buffer>
  received: number
  aborted: string[]
} => {
  const store = new Map<string, Buffer>()
  let n = 0
  const inner = {
    store,
    received: 0,
    aborted: [] as string[],
    upload(
      fieldname: string,
      stream: NodeJS.ReadableStream,
      info: FileInfo,
      onError: (e: Error) => void,
    ): UploadedFile {
      const id = `obj-${++n}`
      const parts: Buffer[] = []
      const file: UploadedFile = {
        id,
        fieldname,
        filename: info.filename,
        encoding: info.encoding,
        mimetype: info.mimeType,
        size: 0,
        uploaded: false,
      }
      file.uploadPromise = new Promise<void>((resolve, reject) => {
        stream.on('data', (d: Buffer) => {
          inner.received += d.length
          file.size += d.length
          parts.push(d)
        })
        stream.on('end', () => {
          store.set(id, Buffer.concat(parts))
          file.uploaded = true
          resolve()
        })
        stream.on('error', (e: Error) => {
          onError(e)
          reject(e)
        })
      })
      file.uploadPromise.catch(() => undefined)
      return file
    },
    async abortUpload(file: UploadedFile) {
      inner.aborted.push(file.id)
      store.delete(file.id)
    },
    async deleteFile(id: string) {
      store.delete(id)
    },
    async getFile(id: string) {
      const data = store.get(id)
      return data ? Readable.from([data]) : null
    },
  }
  return inner
}

const collect = (stream: NodeJS.ReadableStream): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const parts: Buffer[] = []
    stream.on('data', (d: Buffer) => parts.push(d))
    stream.on('end', () => resolve(Buffer.concat(parts)))
    stream.on('error', reject)
  })

/** Collects until end or error, returning the bytes seen and the error. */
const collectUntilError = (
  stream: NodeJS.ReadableStream,
): Promise<{ data: Buffer; error: Error | null }> =>
  new Promise((resolve) => {
    const parts: Buffer[] = []
    stream.on('data', (d: Buffer) => parts.push(d))
    stream.on('end', () => resolve({ data: Buffer.concat(parts), error: null }))
    stream.on('error', (error: Error) => resolve({ data: Buffer.concat(parts), error }))
  })

const uploadBytes = async (
  provider: ReturnType<typeof createProvider>,
  data: Buffer,
  fieldname = 'avatar',
): Promise<UploadedFile> => {
  const onError = vi.fn()
  const file = provider.upload(fieldname, Readable.from(data.length ? [data] : []), INFO, onError)
  await file.uploadPromise
  expect(onError).not.toHaveBeenCalled()
  return file
}

describe('@molecule/api-uploads-encrypted', () => {
  let inner: ReturnType<typeof createMemoryInner>
  let encryption: EncryptionProvider
  let provider: ReturnType<typeof createProvider>

  beforeEach(() => {
    inner = createMemoryInner()
    encryption = createAesProvider({ key: KEY })
    provider = createProvider({ inner, encryption, chunkBytes: CHUNK })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stores ciphertext, never the plaintext', async () => {
    const plaintext = Buffer.from('hello, secret world')
    const file = await uploadBytes(provider, plaintext)
    const { innerId } = provider.parseId(file.id)!
    const stored = inner.store.get(innerId)!
    expect(stored.subarray(0, 8).toString('ascii')).toBe('MOLAEAD1')
    expect(stored.includes(plaintext)).toBe(false)
    expect(file.size).toBe(stored.length)
    expect(file.uploaded).toBe(true)
  })

  it.each([
    ['empty', Buffer.alloc(0)],
    ['small', Buffer.from('tiny')],
    ['~3 MiB random', randomBytes(3 * 1024 * 1024 + 17)],
  ])('round-trips %s', async (_label, plaintext) => {
    const file = await uploadBytes(provider, plaintext)
    const out = await collect((await provider.getFile(file.id))!)
    expect(out.equals(plaintext)).toBe(true)
  })

  it('defaults the context to the fieldname', async () => {
    const file = await uploadBytes(provider, Buffer.from('x'), 'document')
    expect(provider.parseId(file.id)).toEqual({ innerId: 'obj-1', context: 'document' })
  })

  it('uses a custom context function', async () => {
    const contextFn = vi.fn(() => 'backup:42')
    provider = createProvider({ inner, encryption, context: contextFn })
    const file = await uploadBytes(provider, Buffer.from('x'), 'file')
    expect(contextFn).toHaveBeenCalledWith({
      fieldname: 'file',
      filename: INFO.filename,
      mimeType: INFO.mimeType,
    })
    expect(provider.parseId(file.id)?.context).toBe('backup:42')
    const out = await collect((await provider.getFile(file.id, { expectContext: 'backup:42' }))!)
    expect(out.toString()).toBe('x')
  })

  it('throws EncryptionContextMismatchError when expectContext differs', async () => {
    const file = await uploadBytes(provider, Buffer.from('x'))
    await expect(provider.getFile(file.id, { expectContext: 'other' })).rejects.toMatchObject({
      name: 'EncryptionContextMismatchError',
    })
  })

  it('fails as a stream error when decrypted under the wrong context', async () => {
    const file = await uploadBytes(provider, Buffer.from('secret'))
    const { innerId } = provider.parseId(file.id)!
    const forged = encodeEncryptedId('not-avatar', innerId)
    const { data, error } = await collectUntilError((await provider.getFile(forged))!)
    expect(error?.name).toBe('EncryptionStreamError')
    expect((error as { code?: string } | undefined)?.code).toBe('auth')
    expect(data.length).toBe(0)
  })

  it('surfaces a tampered byte as an error on the returned stream, releasing only authenticated chunks', async () => {
    const plaintext = randomBytes(CHUNK * 3 + 100)
    const file = await uploadBytes(provider, plaintext)
    const { innerId } = provider.parseId(file.id)!
    const stored = Buffer.from(inner.store.get(innerId)!)
    stored[stored.length - 30] ^= 0x01 // inside the final chunk
    inner.store.set(innerId, stored)

    const { data, error } = await collectUntilError((await provider.getFile(file.id))!)
    expect(error?.name).toBe('EncryptionStreamError')
    expect(data.length).toBeLessThan(plaintext.length)
    expect(data.length % CHUNK).toBe(0)
    expect(data.equals(plaintext.subarray(0, data.length))).toBe(true)
  })

  it('detects truncated ciphertext at the end of the stream', async () => {
    const plaintext = randomBytes(CHUNK * 2 + 10)
    const file = await uploadBytes(provider, plaintext)
    const { innerId } = provider.parseId(file.id)!
    const stored = inner.store.get(innerId)!
    inner.store.set(innerId, stored.subarray(0, stored.length - 40))

    const { data, error } = await collectUntilError((await provider.getFile(file.id))!)
    expect(error?.name).toBe('EncryptionStreamError')
    expect(data.length).toBeLessThan(plaintext.length)
  })

  it('returns null when the inner provider has no such object', async () => {
    expect(await provider.getFile(encodeEncryptedId('avatar', 'missing'))).toBeNull()
  })

  it('passes legacy (non-encrypted) ids through for read and delete', async () => {
    inner.store.set('legacy-1', Buffer.from('old plaintext'))
    const out = await collect((await provider.getFile('legacy-1', { expectContext: 'avatar' }))!)
    expect(out.toString()).toBe('old plaintext')
    await provider.deleteFile('legacy-1')
    expect(inner.store.has('legacy-1')).toBe(false)
  })

  it('deletes the inner object for an encrypted id', async () => {
    const file = await uploadBytes(provider, Buffer.from('x'))
    await provider.deleteFile(file.id)
    expect(inner.store.size).toBe(0)
  })

  it('aborts the inner upload with the inner id and rejects with UploadAbortedError', async () => {
    const source = new PassThrough()
    const onError = vi.fn()
    const file = provider.upload('avatar', source, INFO, onError)
    source.write(Buffer.from('partial'))
    await provider.abortUpload(file)
    await expect(file.uploadPromise).rejects.toMatchObject({ name: 'UploadAbortedError' })
    expect(inner.aborted).toEqual(['obj-1'])
    expect(onError).not.toHaveBeenCalled()
  })

  it('refuses to upload when the encryption provider has no streams, storing nothing', async () => {
    const { encryptStream: _e, decryptStream: _d, ...noStreams } = encryption
    provider = createProvider({ inner, encryption: noStreams as EncryptionProvider })
    const uploadSpy = vi.spyOn(inner, 'upload')
    const onError = vi.fn()
    const file = provider.upload('avatar', Readable.from([Buffer.from('plain')]), INFO, onError)
    await expect(file.uploadPromise).rejects.toMatchObject({ name: 'EncryptionUnavailableError' })
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'EncryptionUnavailableError' }),
    )
    expect(uploadSpy).not.toHaveBeenCalled()
    expect(inner.received).toBe(0)
    expect(inner.store.size).toBe(0)
  })

  it('reports encrypt-transform errors through onError and aborts the inner upload', async () => {
    const source = new PassThrough()
    const onError = vi.fn()
    const file = provider.upload('avatar', source, INFO, onError)
    source.destroy(new Error('client went away'))
    await expect(file.uploadPromise).rejects.toThrow('client went away')
    expect(onError).toHaveBeenCalledTimes(1)
    await new Promise((r) => setTimeout(r, 0))
    expect(inner.aborted).toEqual(['obj-1'])
  })

  it('uses the bonded @molecule/api-encryption provider by default', async () => {
    setEncryptionProvider(createAesProvider({ key: 'ab'.repeat(32) }))
    const bonded = createProvider({ inner })
    const file = await uploadBytes(bonded, Buffer.from('via bond'))
    expect((await collect((await bonded.getFile(file.id))!)).toString()).toBe('via bond')
    // A provider with a different key cannot read it.
    const { data, error } = await collectUntilError((await provider.getFile(file.id))!)
    expect(error?.name).toBe('EncryptionStreamError')
    // ...and says it is the key, not the object.
    expect((error as { code?: string } | undefined)?.code).toBe('unknown-key')
    expect(data.length).toBe(0)
  })

  it('parses ids', () => {
    const id = encodeEncryptedId('backup:p-1', 'backups/uuid.with.dots')
    expect(id.startsWith('enc1.')).toBe(true)
    expect(parseEncryptedId(id)).toEqual({
      context: 'backup:p-1',
      innerId: 'backups/uuid.with.dots',
    })
    expect(provider.isEncryptedId(id)).toBe(true)
    for (const legacy of [
      'abc',
      'enc1.',
      'enc1.abc',
      'enc1.abc.',
      'enc1..x',
      'enc1.a+b.x',
      'enc2.YQ.x',
    ]) {
      expect(provider.parseId(legacy)).toBeNull()
      expect(provider.isEncryptedId(legacy)).toBe(false)
    }
  })

  it('rejects an empty context', async () => {
    provider = createProvider({ inner, encryption, context: () => '' })
    const onError = vi.fn()
    const file = provider.upload('avatar', Readable.from([Buffer.from('x')]), INFO, onError)
    await expect(file.uploadPromise).rejects.toMatchObject({
      name: 'InvalidEncryptionContextError',
    })
    expect(inner.received).toBe(0)
  })
})
