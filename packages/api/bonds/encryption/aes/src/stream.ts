/**
 * Chunked AES-256-GCM stream encryption in the core's
 * `mol-aead-chunked-v2` framing (see `ENCRYPTED_STREAM_FORMAT` in
 * `@molecule/api-encryption`).
 *
 * Each stream draws a 32-byte random salt and derives its own AES-256 key and
 * 8-byte nonce prefix with HKDF-SHA256 from the long-lived key, so the
 * long-lived key never encrypts a chunk itself and nonces cannot collide
 * across streams. The header carries a key id (a truncated HMAC of the key)
 * so a wrong key is reported as such, not as tampering. The plaintext is cut
 * into fixed-size chunks; each is sealed with nonce `prefix || counter` and
 * AAD `header || context || counter || final`, so reordering, dropping,
 * duplicating or truncating chunks, or editing the header, fails. Neither
 * direction holds more than about one chunk in memory.
 *
 * @module
 */

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { Transform } from 'node:stream'

import { EncryptionStreamError } from '@molecule/api-encryption'

/** ASCII magic that opens every encrypted stream. */
export const STREAM_MAGIC = Buffer.from('MOLAEAD2', 'ascii')

/** Salt length in the header. */
export const STREAM_SALT_BYTES = 32

/** Key-id length in the header. */
export const STREAM_KEY_ID_BYTES = 8

/**
 * Header length: magic (8) + key version (2) + chunk size (4) + salt (32) +
 * key id (8).
 */
export const STREAM_HEADER_BYTES = 54

/** Default plaintext bytes per chunk (1 MiB). */
export const DEFAULT_STREAM_CHUNK_BYTES = 1024 * 1024

/** Smallest allowed chunk size (4 KiB). */
export const MIN_STREAM_CHUNK_BYTES = 4 * 1024

/** Largest allowed chunk size (16 MiB). */
export const MAX_STREAM_CHUNK_BYTES = 16 * 1024 * 1024

const ALGORITHM = 'aes-256-gcm'
const TAG_BYTES = 16
const KEY_BYTES = 32
const NONCE_PREFIX_BYTES = 8
const MAX_COUNTER = 0xffffffff
const MAX_KEY_VERSION = 0xffff
const SALT_OFFSET = 14
const KEY_ID_OFFSET = SALT_OFFSET + STREAM_SALT_BYTES
const HKDF_INFO = Buffer.from('mol-aead-chunked-v2', 'utf-8')
const KEY_ID_LABEL = Buffer.from('mol-aead-chunked-v2/kid', 'utf-8')

/**
 * The message for a stream (or ciphertext) whose key version is not in the
 * keyring.
 *
 * @param version - The missing key version.
 * @returns The message.
 */
export const missingKeyMessage = (version: number): string =>
  `No encryption key available for key version ${version}; ` +
  `seed it via priorKeys or do not prune it before re-encrypting its ciphertext`

/**
 * Computes the 8-byte key id written into the header: the first 8 bytes of
 * HMAC-SHA256(key, `mol-aead-chunked-v2/kid`).
 *
 * @param key - The raw 32-byte key.
 * @returns The key id.
 */
export const streamKeyId = (key: Buffer): Buffer =>
  createHmac('sha256', key).update(KEY_ID_LABEL).digest().subarray(0, STREAM_KEY_ID_BYTES)

/** A stream's derived AES key and nonce prefix. */
export interface StreamMaterial {
  /** The stream's AES-256 key (32 bytes). */
  key: Buffer
  /** The stream's nonce prefix (8 bytes). */
  noncePrefix: Buffer
}

/**
 * Derives a stream's AES key and nonce prefix:
 * HKDF-SHA256(ikm = key, salt, info = `mol-aead-chunked-v2`, 40 bytes).
 *
 * @param key - The raw 32-byte long-lived key.
 * @param salt - The stream's 32-byte salt.
 * @returns The stream key (bytes 0–31) and nonce prefix (bytes 32–39).
 */
export const deriveStreamMaterial = (key: Buffer, salt: Buffer): StreamMaterial => {
  const okm = Buffer.from(hkdfSync('sha256', key, salt, HKDF_INFO, KEY_BYTES + NONCE_PREFIX_BYTES))
  return { key: okm.subarray(0, KEY_BYTES), noncePrefix: okm.subarray(KEY_BYTES) }
}

/**
 * Builds the 12-byte nonce for one chunk.
 *
 * @param prefix - The stream's 8-byte derived nonce prefix.
 * @param counter - The chunk counter.
 * @returns The chunk nonce.
 */
const chunkNonce = (prefix: Buffer, counter: number): Buffer => {
  const nonce = Buffer.alloc(12)
  prefix.copy(nonce, 0)
  nonce.writeUInt32BE(counter, NONCE_PREFIX_BYTES)
  return nonce
}

/**
 * Builds the AAD for one chunk: header || context || counter || final.
 *
 * @param header - The stream's 54 header bytes.
 * @param context - UTF-8 bytes of the caller's context.
 * @param counter - The chunk counter.
 * @param final - Whether this is the last chunk.
 * @returns The chunk AAD.
 */
const chunkAad = (header: Buffer, context: Buffer, counter: number, final: boolean): Buffer => {
  const tail = Buffer.alloc(5)
  tail.writeUInt32BE(counter, 0)
  tail[4] = final ? 1 : 0
  return Buffer.concat([header, context, tail])
}

/**
 * Validates a chunk size.
 *
 * @param chunkBytes - The requested plaintext bytes per chunk.
 * @returns Whether it is an integer within the allowed range.
 */
const validChunkBytes = (chunkBytes: number): boolean =>
  Number.isInteger(chunkBytes) &&
  chunkBytes >= MIN_STREAM_CHUNK_BYTES &&
  chunkBytes <= MAX_STREAM_CHUNK_BYTES

/**
 * Passes stream errors through and wraps anything else as `internal`.
 *
 * @param error - The caught value.
 * @returns An `EncryptionStreamError`.
 */
const asStreamError = (error: unknown): EncryptionStreamError =>
  error instanceof EncryptionStreamError
    ? error
    : new EncryptionStreamError(
        'internal',
        `Unexpected error in the encryption stream: ${(error as Error)?.message ?? String(error)}`,
        { cause: error },
      )

/**
 * Small FIFO of buffers that hands out exact-length slices without
 * re-concatenating on every write.
 */
class ByteQueue {
  private parts: Buffer[] = []
  length = 0

  /**
   * Appends bytes to the end of the queue.
   *
   * @param buf - The bytes to append.
   */
  push(buf: Buffer): void {
    if (buf.length === 0) return
    this.parts.push(buf)
    this.length += buf.length
  }

  /**
   * Removes and returns the first `n` bytes (`n` must be <= `length`).
   *
   * @param n - Number of bytes to take.
   * @returns The bytes.
   */
  take(n: number): Buffer {
    const out = Buffer.allocUnsafe(n)
    let filled = 0
    while (filled < n) {
      const head = this.parts[0]
      const need = n - filled
      if (head.length <= need) {
        head.copy(out, filled)
        filled += head.length
        this.parts.shift()
      } else {
        head.copy(out, filled, 0, need)
        this.parts[0] = head.subarray(need)
        filled += need
      }
    }
    this.length -= n
    return out
  }
}

/** Options for {@link createEncryptStream}. */
export interface EncryptStreamParams {
  /** The 32-byte long-lived key to derive the stream key from. */
  key: Buffer
  /** The key's version, written into the header. */
  version: number
  /** Optional AAD context. */
  context?: string
  /** Plaintext bytes per chunk. */
  chunkBytes?: number
}

/**
 * Creates a Transform that encrypts plaintext into the chunked framing.
 *
 * @param params - Key, version, context and chunk size.
 * @returns The encrypting Transform.
 * @throws {EncryptionStreamError} `internal` on an out-of-range chunk size or key version.
 */
export const createEncryptStream = (params: EncryptStreamParams): Transform => {
  const chunkBytes = params.chunkBytes ?? DEFAULT_STREAM_CHUNK_BYTES
  if (!validChunkBytes(chunkBytes)) {
    throw new EncryptionStreamError(
      'internal',
      `Stream chunk size must be a whole number of bytes between ${MIN_STREAM_CHUNK_BYTES} ` +
        `and ${MAX_STREAM_CHUNK_BYTES}; got ${chunkBytes}.`,
    )
  }
  if (!Number.isInteger(params.version) || params.version < 0 || params.version > MAX_KEY_VERSION) {
    throw new EncryptionStreamError(
      'internal',
      `Key version ${params.version} cannot be written into a stream header (0 to ${MAX_KEY_VERSION}).`,
    )
  }
  if (params.key.length !== KEY_BYTES) {
    throw new EncryptionStreamError('internal', `Stream key must be ${KEY_BYTES} bytes.`)
  }

  const context = Buffer.from(params.context ?? '', 'utf-8')
  const salt = randomBytes(STREAM_SALT_BYTES)
  const { key, noncePrefix } = deriveStreamMaterial(params.key, salt)
  const pending = new ByteQueue()
  let counter = 0
  let headerSent = false

  const header = Buffer.alloc(STREAM_HEADER_BYTES)
  STREAM_MAGIC.copy(header, 0)
  header.writeUInt16BE(params.version, 8)
  header.writeUInt32BE(chunkBytes, 10)
  salt.copy(header, SALT_OFFSET)
  streamKeyId(params.key).copy(header, KEY_ID_OFFSET)

  const seal = (plaintext: Buffer, final: boolean): Buffer => {
    if (counter > MAX_COUNTER) {
      throw new EncryptionStreamError(
        'overflow',
        'The stream is too long to encrypt: it would need more than 2^32 chunks. Use a larger chunk size.',
      )
    }
    const cipher = createCipheriv(ALGORITHM, key, chunkNonce(noncePrefix, counter), {
      authTagLength: TAG_BYTES,
    })
    cipher.setAAD(chunkAad(header, context, counter, final))
    const out = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()])
    counter += 1
    return out
  }

  const sendHeader = (stream: Transform): void => {
    if (!headerSent) {
      headerSent = true
      stream.push(header)
    }
  }

  return new Transform({
    transform(chunk: Buffer | string, encoding, callback) {
      try {
        sendHeader(this)
        pending.push(typeof chunk === 'string' ? Buffer.from(chunk, encoding) : chunk)
        // A full chunk is sealed as non-final as soon as it exists; the final
        // chunk is therefore always shorter than chunkBytes (possibly empty).
        while (pending.length >= chunkBytes) {
          this.push(seal(pending.take(chunkBytes), false))
        }
        callback()
      } catch (error) {
        callback(asStreamError(error))
      }
    },
    flush(callback) {
      try {
        sendHeader(this)
        this.push(seal(pending.take(pending.length), true))
        callback()
      } catch (error) {
        callback(asStreamError(error))
      }
    },
  })
}

/** Options for {@link createDecryptStream}. */
export interface DecryptStreamParams {
  /**
   * Returns the raw 32-byte key for a header's key version, or `undefined`
   * when the keyring does not hold that version.
   */
  resolveKey: (version: number) => Buffer | undefined
  /** Optional AAD context; must match the one used to encrypt. */
  context?: string
}

/**
 * Creates a Transform that authenticates and decrypts the chunked framing.
 * Each chunk's plaintext is pushed only after its tag verifies. Errors carry
 * a `code`: `bad-header`, `unknown-key-version`, `unknown-key`, `auth`,
 * `truncated`, `overflow` or `internal`.
 *
 * @param params - Key resolver and context.
 * @returns The decrypting Transform.
 */
export const createDecryptStream = (params: DecryptStreamParams): Transform => {
  const context = Buffer.from(params.context ?? '', 'utf-8')
  const pending = new ByteQueue()
  let header: Buffer | null = null
  let key: Buffer | null = null
  let prefix: Buffer | null = null
  let recordBytes = 0
  let counter = 0

  const parseHeader = (bytes: Buffer): void => {
    if (!bytes.subarray(0, 8).equals(STREAM_MAGIC)) {
      throw new EncryptionStreamError(
        'bad-header',
        'This is not an encrypted stream (its header does not start with MOLAEAD2).',
      )
    }
    const version = bytes.readUInt16BE(8)
    const chunkBytes = bytes.readUInt32BE(10)
    if (!validChunkBytes(chunkBytes)) {
      throw new EncryptionStreamError(
        'bad-header',
        `The encrypted stream's header names an invalid chunk size (${chunkBytes} bytes).`,
      )
    }
    const longKey = params.resolveKey(version)
    if (!longKey) {
      throw new EncryptionStreamError('unknown-key-version', missingKeyMessage(version))
    }
    const expectedId = streamKeyId(longKey)
    const actualId = bytes.subarray(KEY_ID_OFFSET, KEY_ID_OFFSET + STREAM_KEY_ID_BYTES)
    if (!timingSafeEqual(expectedId, actualId)) {
      throw new EncryptionStreamError(
        'unknown-key',
        `The encrypted stream was written under a different key for key version ${version} ` +
          `than the one configured (key id mismatch). Check the encryption key configuration.`,
      )
    }
    const material = deriveStreamMaterial(
      longKey,
      bytes.subarray(SALT_OFFSET, SALT_OFFSET + STREAM_SALT_BYTES),
    )
    header = bytes
    key = material.key
    prefix = material.noncePrefix
    recordBytes = chunkBytes + TAG_BYTES
  }

  const open = (record: Buffer, final: boolean): Buffer => {
    if (counter > MAX_COUNTER) {
      throw new EncryptionStreamError('overflow', 'The encrypted stream has more than 2^32 chunks.')
    }
    const decipher = createDecipheriv(
      ALGORITHM,
      key as Buffer,
      chunkNonce(prefix as Buffer, counter),
      {
        authTagLength: TAG_BYTES,
      },
    )
    decipher.setAAD(chunkAad(header as Buffer, context, counter, final))
    decipher.setAuthTag(record.subarray(record.length - TAG_BYTES))
    const body = decipher.update(record.subarray(0, record.length - TAG_BYTES))
    let tail: Buffer
    try {
      tail = decipher.final()
    } catch (error) {
      throw new EncryptionStreamError(
        'auth',
        `Chunk ${counter} of the encrypted stream failed authentication: the data or header was ` +
          `altered, chunks were reordered or cut, or the context does not match.`,
        { cause: error },
      )
    }
    counter += 1
    return tail.length ? Buffer.concat([body, tail]) : body
  }

  return new Transform({
    transform(chunk: Buffer | string, encoding, callback) {
      try {
        pending.push(typeof chunk === 'string' ? Buffer.from(chunk, encoding) : chunk)
        if (!key) {
          if (pending.length < STREAM_HEADER_BYTES) return callback()
          parseHeader(pending.take(STREAM_HEADER_BYTES))
        }
        // A full-size record is never the final chunk (the encryptor always
        // closes with a shorter one), so it can be opened immediately.
        while (pending.length >= recordBytes) {
          this.push(open(pending.take(recordBytes), false))
        }
        callback()
      } catch (error) {
        callback(asStreamError(error))
      }
    },
    flush(callback) {
      try {
        if (!key) {
          throw new EncryptionStreamError(
            'bad-header',
            `The encrypted stream ended before its ${STREAM_HEADER_BYTES}-byte header was complete ` +
              `(${pending.length} byte(s)).`,
          )
        }
        if (pending.length < TAG_BYTES) {
          throw new EncryptionStreamError(
            'truncated',
            `The encrypted stream was truncated: it ended after ${counter} chunk(s) without its final chunk.`,
          )
        }
        this.push(open(pending.take(pending.length), true))
        callback()
      } catch (error) {
        callback(asStreamError(error))
      }
    },
  })
}
