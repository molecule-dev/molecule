import { randomBytes } from 'node:crypto'
import { Readable, type Transform, Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { describe, expect, it } from 'vitest'

import { hasStreamEncryption } from '@molecule/api-encryption'

import { createProvider } from '../provider.js'
import { STREAM_HEADER_BYTES } from '../stream.js'

const generateKey = (): string => randomBytes(32).toString('hex')
const CHUNK = 4096
const RECORD = CHUNK + 16

/** Pipes `input` (fed as the given pieces) through `transform`, collecting output. */
const run = async (transform: Transform, pieces: Buffer[]): Promise<Buffer> => {
  const out: Buffer[] = []
  await pipeline(
    Readable.from(pieces, { objectMode: false }),
    transform,
    new Writable({
      write(chunk: Buffer, _enc, cb) {
        out.push(chunk)
        cb()
      },
    }),
  )
  return Buffer.concat(out)
}

/** Splits a buffer into pieces of the given size. */
const split = (buf: Buffer, size: number): Buffer[] => {
  const pieces: Buffer[] = []
  for (let i = 0; i < buf.length; i += size) pieces.push(buf.subarray(i, i + size))
  return pieces
}

describe('AES-256-GCM stream encryption', () => {
  const provider = createProvider({ key: generateKey() })

  const encrypt = (plain: Buffer, context?: string, pieceSize = 1000): Promise<Buffer> =>
    run(provider.encryptStream({ chunkBytes: CHUNK, context }), split(plain, pieceSize))

  const decrypt = (cipher: Buffer, context?: string, pieceSize = 777): Promise<Buffer> =>
    run(provider.decryptStream({ context }), split(cipher, pieceSize))

  it('implements the optional stream contract', () => {
    expect(hasStreamEncryption(provider)).toBe(true)
  })

  describe('round trips', () => {
    const sizes: Array<[string, number]> = [
      ['empty', 0],
      ['1 byte', 1],
      ['exactly one chunk', CHUNK],
      ['one chunk + 1', CHUNK + 1],
      ['~5 MiB', 5 * 1024 * 1024 + 123],
    ]
    for (const [label, size] of sizes) {
      it(`round-trips ${label}`, async () => {
        const plain = randomBytes(size)
        const cipher = await encrypt(plain, undefined, 65536)
        // header + one record per full chunk + a final (shorter) record
        const full = Math.floor(size / CHUNK)
        expect(cipher.length).toBe(STREAM_HEADER_BYTES + full * RECORD + (size % CHUNK) + 16)
        expect((await decrypt(cipher, undefined, 65536)).equals(plain)).toBe(true)
      })
    }

    it('writes an empty final chunk when the input is an exact multiple of the chunk size', async () => {
      const cipher = await encrypt(randomBytes(CHUNK * 3))
      expect(cipher.length).toBe(STREAM_HEADER_BYTES + 3 * RECORD + 16)
    })

    it('uses the 1 MiB default chunk size and the header layout', async () => {
      const cipher = await run(provider.encryptStream(), [Buffer.from('hi')])
      expect(cipher.subarray(0, 8).toString('ascii')).toBe('MOLAEAD1')
      expect(cipher.readUInt16BE(8)).toBe(1)
      expect(cipher.readUInt32BE(10)).toBe(1048576)
      expect(cipher.length).toBe(STREAM_HEADER_BYTES + 2 + 16)
      expect((await run(provider.decryptStream(), [cipher])).toString()).toBe('hi')
    })

    it('honors streamChunkBytes from the config', async () => {
      const p = createProvider({ key: generateKey(), streamChunkBytes: 8192 })
      const cipher = await run(p.encryptStream(), [Buffer.alloc(10)])
      expect(cipher.readUInt32BE(10)).toBe(8192)
    })

    it('decrypts when fed one byte at a time', async () => {
      const plain = randomBytes(CHUNK * 2 + 17)
      const cipher = await encrypt(plain)
      expect((await decrypt(cipher, undefined, 1)).equals(plain)).toBe(true)
    })

    it('decrypts at odd boundaries (split header, split chunks, several chunks per write)', async () => {
      const plain = randomBytes(CHUNK * 7 + 5)
      const cipher = await encrypt(plain, 'ctx', 3)
      for (const size of [5, 13, STREAM_HEADER_BYTES + 1, RECORD - 1, RECORD + 1, RECORD * 3 + 7]) {
        expect((await decrypt(cipher, 'ctx', size)).equals(plain)).toBe(true)
      }
    })

    it('accepts string input on encrypt', async () => {
      const enc = provider.encryptStream({ chunkBytes: CHUNK })
      const out: Buffer[] = []
      enc.on('data', (d: Buffer) => out.push(d))
      const done = new Promise((resolve) => enc.on('end', resolve))
      enc.end('héllo', 'utf-8')
      await done
      expect((await decrypt(Buffer.concat(out))).toString('utf-8')).toBe('héllo')
    })
  })

  describe('detection', () => {
    const expectStreamError = async (promise: Promise<unknown>, message: RegExp): Promise<void> => {
      const err = (await promise.then(
        () => null,
        (e: unknown) => e,
      )) as Error | null
      expect(err).toBeInstanceOf(Error)
      expect(err?.name).toBe('EncryptionStreamError')
      expect(err?.message).toMatch(message)
    }

    it('fails on a context mismatch', async () => {
      const cipher = await encrypt(randomBytes(100), 'backup:1')
      await expectStreamError(decrypt(cipher, 'backup:2'), /failed authentication/)
      await expectStreamError(decrypt(cipher), /failed authentication/)
    })

    it('fails on a flipped header magic byte', async () => {
      const cipher = await encrypt(randomBytes(100))
      cipher[0] ^= 0x01
      await expectStreamError(decrypt(cipher), /not an encrypted stream/)
    })

    it('fails on a flipped nonce-prefix byte in the header', async () => {
      const cipher = await encrypt(randomBytes(100))
      cipher[STREAM_HEADER_BYTES - 1] ^= 0x01
      await expectStreamError(decrypt(cipher), /failed authentication/)
    })

    it('fails on a header naming an invalid chunk size', async () => {
      const cipher = await encrypt(randomBytes(100))
      cipher.writeUInt32BE(1, 10)
      await expectStreamError(decrypt(cipher), /invalid chunk size/)
    })

    it('fails on a flipped body byte', async () => {
      const cipher = await encrypt(randomBytes(CHUNK * 2 + 10))
      cipher[STREAM_HEADER_BYTES + RECORD + 5] ^= 0x80
      await expectStreamError(decrypt(cipher), /Chunk 1 .*failed authentication/)
    })

    it('fails on a flipped tag byte', async () => {
      const cipher = await encrypt(randomBytes(CHUNK * 2 + 10))
      cipher[STREAM_HEADER_BYTES + RECORD - 1] ^= 0x01
      await expectStreamError(decrypt(cipher), /Chunk 0 .*failed authentication/)
    })

    it('emits no plaintext from a chunk whose tag fails', async () => {
      const plain = randomBytes(CHUNK * 3 + 10)
      const cipher = await encrypt(plain)
      cipher[STREAM_HEADER_BYTES + RECORD + 5] ^= 0x80 // corrupt chunk 1
      const received: Buffer[] = []
      const stream = provider.decryptStream()
      stream.on('data', (d: Buffer) => received.push(d))
      await expect(pipeline(Readable.from(split(cipher, RECORD * 4)), stream)).rejects.toThrow(
        /failed authentication/,
      )
      // only chunk 0's plaintext was released
      expect(Buffer.concat(received).equals(plain.subarray(0, CHUNK))).toBe(true)
    })

    it('fails when two chunks are swapped', async () => {
      const cipher = await encrypt(randomBytes(CHUNK * 3 + 10))
      const h = cipher.subarray(0, STREAM_HEADER_BYTES)
      const c0 = cipher.subarray(STREAM_HEADER_BYTES, STREAM_HEADER_BYTES + RECORD)
      const c1 = cipher.subarray(STREAM_HEADER_BYTES + RECORD, STREAM_HEADER_BYTES + 2 * RECORD)
      const rest = cipher.subarray(STREAM_HEADER_BYTES + 2 * RECORD)
      await expectStreamError(
        decrypt(Buffer.concat([h, c1, c0, rest])),
        /Chunk 0 .*failed authentication/,
      )
    })

    it('fails at flush when truncated after N full chunks', async () => {
      const cipher = await encrypt(randomBytes(CHUNK * 4 + 10))
      const cut = cipher.subarray(0, STREAM_HEADER_BYTES + 2 * RECORD)
      await expectStreamError(decrypt(cut), /truncated: it ended after 2 chunk\(s\)/)
    })

    it('fails when the empty final chunk is dropped', async () => {
      const cipher = await encrypt(randomBytes(CHUNK * 2))
      await expectStreamError(
        decrypt(cipher.subarray(0, cipher.length - 16)),
        /truncated: it ended after 2 chunk\(s\)/,
      )
    })

    it('fails when the final chunk is cut mid-way', async () => {
      const cipher = await encrypt(randomBytes(CHUNK + 100))
      await expectStreamError(
        decrypt(cipher.subarray(0, cipher.length - 30)),
        /failed authentication/,
      )
    })

    it('fails on a truncated header', async () => {
      const cipher = await encrypt(randomBytes(10))
      await expectStreamError(decrypt(cipher.subarray(0, 10)), /before its header was complete/)
      await expectStreamError(decrypt(Buffer.alloc(0)), /before its header was complete/)
    })

    it('fails on an unknown key version', async () => {
      const cipher = await encrypt(randomBytes(10))
      cipher.writeUInt16BE(9, 8)
      await expectStreamError(decrypt(cipher), /No encryption key available for key version 9/)
    })

    it('fails under a different key', async () => {
      const cipher = await encrypt(randomBytes(10))
      const other = createProvider({ key: generateKey() })
      await expectStreamError(run(other.decryptStream(), [cipher]), /failed authentication/)
    })

    it('rejects an out-of-range chunk size at creation', () => {
      expect(() => provider.encryptStream({ chunkBytes: 1024 })).toThrow(
        /between 4096 and 16777216/,
      )
      expect(() => provider.encryptStream({ chunkBytes: 32 * 1024 * 1024 })).toThrow(
        /between 4096 and 16777216/,
      )
      expect(() => provider.encryptStream({ chunkBytes: 5000.5 })).toThrow(/between/)
    })
  })

  describe('key rotation', () => {
    it('decrypts pre-rotation streams after rotateKey and encrypts new ones under the new version', async () => {
      const oldKey = generateKey()
      const newKey = generateKey()
      const p = createProvider({ key: oldKey })
      const plain = randomBytes(CHUNK + 50)
      const before = await run(p.encryptStream({ chunkBytes: CHUNK }), [plain])
      await p.rotateKey(oldKey, newKey)
      const after = await run(p.encryptStream({ chunkBytes: CHUNK }), [plain])
      expect(before.readUInt16BE(8)).toBe(1)
      expect(after.readUInt16BE(8)).toBe(2)
      expect((await run(p.decryptStream(), [before])).equals(plain)).toBe(true)
      expect((await run(p.decryptStream(), [after])).equals(plain)).toBe(true)
    })

    it('decrypts old streams through priorKeys after a restart', async () => {
      const oldKey = generateKey()
      const plain = randomBytes(CHUNK * 2 + 1)
      const cipher = await run(
        createProvider({ key: oldKey }).encryptStream({ chunkBytes: CHUNK }),
        [plain],
      )
      const restarted = createProvider({
        key: generateKey(),
        keyVersion: 2,
        priorKeys: [{ version: 1, key: oldKey }],
      })
      expect((await run(restarted.decryptStream(), [cipher])).equals(plain)).toBe(true)
    })

    it('fails once the old version is pruned', async () => {
      const oldKey = generateKey()
      const p = createProvider({ key: oldKey })
      const cipher = await run(p.encryptStream(), [Buffer.from('x')])
      await p.rotateKey(oldKey, generateKey())
      p.pruneKeyVersions()
      await expect(run(p.decryptStream(), [cipher])).rejects.toThrow(
        /No encryption key available for key version 1/,
      )
    })
  })
})
