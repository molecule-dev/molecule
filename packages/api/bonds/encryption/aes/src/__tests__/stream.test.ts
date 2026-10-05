import { createHmac, hkdfSync, randomBytes } from 'node:crypto'
import { Readable, type Transform, Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { describe, expect, it } from 'vitest'

import {
  type EncryptionStreamErrorCode,
  hasStreamEncryption,
  isEncryptionStreamError,
} from '@molecule/api-encryption'

import { createProvider } from '../provider.js'
import {
  createDecryptStream,
  createEncryptStream,
  deriveStreamMaterial,
  STREAM_HEADER_BYTES,
  STREAM_KEY_ID_BYTES,
  STREAM_SALT_BYTES,
  streamKeyId,
} from '../stream.js'

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
      expect(STREAM_HEADER_BYTES).toBe(8 + 2 + 4 + STREAM_SALT_BYTES + STREAM_KEY_ID_BYTES)
      expect(STREAM_HEADER_BYTES).toBe(54)
      const cipher = await run(provider.encryptStream(), [Buffer.from('hi')])
      expect(cipher.subarray(0, 8).toString('ascii')).toBe('MOLAEAD2')
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
    const expectStreamError = async (
      promise: Promise<unknown>,
      code: EncryptionStreamErrorCode,
      message?: RegExp,
    ): Promise<void> => {
      const err = (await promise.then(
        () => null,
        (e: unknown) => e,
      )) as Error | null
      expect(err).toBeInstanceOf(Error)
      expect(err?.name).toBe('EncryptionStreamError')
      expect(isEncryptionStreamError(err)).toBe(true)
      expect((err as { code?: string }).code).toBe(code)
      if (message) expect(err?.message).toMatch(message)
    }

    it('auth: fails on a context mismatch', async () => {
      const cipher = await encrypt(randomBytes(100), 'backup:1')
      await expectStreamError(decrypt(cipher, 'backup:2'), 'auth', /failed authentication/)
      await expectStreamError(decrypt(cipher), 'auth', /failed authentication/)
    })

    it('bad-header: fails on a flipped header magic byte', async () => {
      const cipher = await encrypt(randomBytes(100))
      cipher[0] ^= 0x01
      await expectStreamError(decrypt(cipher), 'bad-header', /not an encrypted stream/)
    })

    it('auth: fails on a flipped salt byte in the header', async () => {
      const cipher = await encrypt(randomBytes(100))
      cipher[14] ^= 0x01
      await expectStreamError(decrypt(cipher), 'auth', /Chunk 0 .*failed authentication/)
    })

    it('unknown-key: a flipped key-id byte reads as a key mismatch', async () => {
      const cipher = await encrypt(randomBytes(100))
      cipher[STREAM_HEADER_BYTES - 1] ^= 0x01
      await expectStreamError(decrypt(cipher), 'unknown-key', /different key/)
    })

    it('bad-header: fails on a header naming an invalid chunk size', async () => {
      const cipher = await encrypt(randomBytes(100))
      cipher.writeUInt32BE(1, 10)
      await expectStreamError(decrypt(cipher), 'bad-header', /invalid chunk size/)
    })

    it('auth: an edited (still valid) chunk size fails authentication, header is bound', async () => {
      const cipher = await encrypt(randomBytes(100))
      cipher.writeUInt32BE(CHUNK * 2, 10)
      await expectStreamError(decrypt(cipher), 'auth', /failed authentication/)
    })

    it('auth: fails on a flipped body byte', async () => {
      const cipher = await encrypt(randomBytes(CHUNK * 2 + 10))
      cipher[STREAM_HEADER_BYTES + RECORD + 5] ^= 0x80
      await expectStreamError(decrypt(cipher), 'auth', /Chunk 1 .*failed authentication/)
    })

    it('auth: fails on a flipped tag byte', async () => {
      const cipher = await encrypt(randomBytes(CHUNK * 2 + 10))
      cipher[STREAM_HEADER_BYTES + RECORD - 1] ^= 0x01
      await expectStreamError(decrypt(cipher), 'auth', /Chunk 0 .*failed authentication/)
    })

    it('auth: a header swapped in from another stream under the same key fails authentication', async () => {
      const a = await encrypt(randomBytes(CHUNK + 10))
      const b = await encrypt(randomBytes(CHUNK + 10))
      const forged = Buffer.concat([
        b.subarray(0, STREAM_HEADER_BYTES),
        a.subarray(STREAM_HEADER_BYTES),
      ])
      await expectStreamError(decrypt(forged), 'auth', /Chunk 0 .*failed authentication/)
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

    it('auth: fails when two chunks are swapped', async () => {
      const cipher = await encrypt(randomBytes(CHUNK * 3 + 10))
      const h = cipher.subarray(0, STREAM_HEADER_BYTES)
      const c0 = cipher.subarray(STREAM_HEADER_BYTES, STREAM_HEADER_BYTES + RECORD)
      const c1 = cipher.subarray(STREAM_HEADER_BYTES + RECORD, STREAM_HEADER_BYTES + 2 * RECORD)
      const rest = cipher.subarray(STREAM_HEADER_BYTES + 2 * RECORD)
      await expectStreamError(
        decrypt(Buffer.concat([h, c1, c0, rest])),
        'auth',
        /Chunk 0 .*failed authentication/,
      )
    })

    it('truncated: fails at flush when cut after N full chunks', async () => {
      const cipher = await encrypt(randomBytes(CHUNK * 4 + 10))
      const cut = cipher.subarray(0, STREAM_HEADER_BYTES + 2 * RECORD)
      await expectStreamError(decrypt(cut), 'truncated', /ended after 2 chunk\(s\)/)
    })

    it('truncated: fails when the empty final chunk is dropped', async () => {
      const cipher = await encrypt(randomBytes(CHUNK * 2))
      await expectStreamError(
        decrypt(cipher.subarray(0, cipher.length - 16)),
        'truncated',
        /ended after 2 chunk\(s\)/,
      )
    })

    it('truncated: a stream holding only its header', async () => {
      const cipher = await encrypt(randomBytes(10))
      await expectStreamError(
        decrypt(cipher.subarray(0, STREAM_HEADER_BYTES)),
        'truncated',
        /ended after 0 chunk\(s\)/,
      )
    })

    it('auth: fails when the final chunk is cut mid-way', async () => {
      const cipher = await encrypt(randomBytes(CHUNK + 100))
      await expectStreamError(
        decrypt(cipher.subarray(0, cipher.length - 30)),
        'auth',
        /failed authentication/,
      )
    })

    it('bad-header: fails on a truncated header', async () => {
      const cipher = await encrypt(randomBytes(10))
      await expectStreamError(
        decrypt(cipher.subarray(0, STREAM_HEADER_BYTES - 1)),
        'bad-header',
        /before its 54-byte header was complete/,
      )
      await expectStreamError(decrypt(Buffer.alloc(0)), 'bad-header', /header was complete/)
    })

    it('unknown-key-version: the header names a version the keyring lacks', async () => {
      const key = generateKey()
      const v2 = createProvider({ key, keyVersion: 2 })
      const cipher = await run(v2.encryptStream({ chunkBytes: CHUNK }), [randomBytes(10)])
      const withoutV2 = createProvider({ key, keyVersion: 1 })
      await expectStreamError(
        run(withoutV2.decryptStream(), [cipher]),
        'unknown-key-version',
        /No encryption key available for key version 2/,
      )
    })

    it('unknown-key: a different key under the same version is not reported as tampering', async () => {
      const cipher = await encrypt(randomBytes(10))
      const other = createProvider({ key: generateKey() })
      await expectStreamError(run(other.decryptStream(), [cipher]), 'unknown-key', /key id/)
    })

    it('internal: rejects an out-of-range chunk size at creation', () => {
      for (const chunkBytes of [1024, 32 * 1024 * 1024, 5000.5]) {
        let err: unknown
        try {
          provider.encryptStream({ chunkBytes })
        } catch (e) {
          err = e
        }
        expect(isEncryptionStreamError(err)).toBe(true)
        expect((err as { code: string }).code).toBe('internal')
        expect((err as Error).message).toMatch(/between 4096 and 16777216/)
      }
    })

    it('internal: rejects an out-of-range key version at creation', () => {
      expect(() => createEncryptStream({ key: randomBytes(32), version: 0x10000 })).toThrow(
        expect.objectContaining({ code: 'internal' }),
      )
    })
  })

  describe('key derivation', () => {
    it('derives the stream key and nonce prefix with HKDF-SHA256 deterministically', () => {
      const key = randomBytes(32)
      const salt = randomBytes(STREAM_SALT_BYTES)
      const a = deriveStreamMaterial(key, salt)
      const b = deriveStreamMaterial(key, salt)
      expect(a.key.length).toBe(32)
      expect(a.noncePrefix.length).toBe(8)
      expect(a.key.equals(b.key)).toBe(true)
      expect(a.noncePrefix.equals(b.noncePrefix)).toBe(true)
      const okm = Buffer.from(hkdfSync('sha256', key, salt, Buffer.from('mol-aead-chunked-v2'), 40))
      expect(a.key.equals(okm.subarray(0, 32))).toBe(true)
      expect(a.noncePrefix.equals(okm.subarray(32))).toBe(true)
      expect(a.key.equals(key)).toBe(false)
    })

    it('computes the key id as truncated HMAC-SHA256 over the label', () => {
      const key = randomBytes(32)
      const expected = createHmac('sha256', key)
        .update('mol-aead-chunked-v2/kid')
        .digest()
        .subarray(0, 8)
      expect(streamKeyId(key).equals(expected)).toBe(true)
    })

    it('writes the salt and key id into the header and derives a fresh subkey per stream', async () => {
      const rawHex = generateKey()
      const raw = Buffer.from(rawHex, 'hex')
      const p = createProvider({ key: rawHex })
      const s1 = await run(p.encryptStream({ chunkBytes: CHUNK }), [Buffer.from('x')])
      const s2 = await run(p.encryptStream({ chunkBytes: CHUNK }), [Buffer.from('x')])
      const salt1 = s1.subarray(14, 14 + STREAM_SALT_BYTES)
      const salt2 = s2.subarray(14, 14 + STREAM_SALT_BYTES)
      expect(salt1.equals(salt2)).toBe(false)
      expect(s1.subarray(46, 54).equals(streamKeyId(raw))).toBe(true)
      expect(s2.subarray(46, 54).equals(streamKeyId(raw))).toBe(true)
      const m1 = deriveStreamMaterial(raw, salt1)
      const m2 = deriveStreamMaterial(raw, salt2)
      expect(m1.key.equals(m2.key)).toBe(false)
      expect(m1.noncePrefix.equals(m2.noncePrefix)).toBe(false)
    })

    it('works through the low-level transforms with a resolver', async () => {
      const key = randomBytes(32)
      const plain = randomBytes(CHUNK + 7)
      const cipher = await run(createEncryptStream({ key, version: 7, chunkBytes: CHUNK }), [plain])
      const out = await run(
        createDecryptStream({ resolveKey: (v) => (v === 7 ? key : undefined) }),
        [cipher],
      )
      expect(out.equals(plain)).toBe(true)
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
      await expect(run(p.decryptStream(), [cipher])).rejects.toMatchObject({
        code: 'unknown-key-version',
        message: expect.stringMatching(/No encryption key available for key version 1/),
      })
    })
  })
})

describe('R93: one nonce per chunk', () => {
  it('two identical plaintext chunks never seal to the same ciphertext bytes', async () => {
    const provider = createProvider({ key: generateKey() })
    const plain = Buffer.alloc(CHUNK * 2, 7)
    const out = await run(provider.encryptStream({ chunkBytes: CHUNK }), split(plain, 1000))
    const header = 54
    const first = out.subarray(header, header + CHUNK)
    const second = out.subarray(header + RECORD, header + RECORD + CHUNK)
    expect(first.equals(second)).toBe(false)
  })
})
