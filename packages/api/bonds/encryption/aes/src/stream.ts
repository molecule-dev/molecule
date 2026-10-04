/**
 * Chunked AES-256-GCM stream encryption in the core's
 * `mol-aead-chunked-v1` framing (see `ENCRYPTED_STREAM_FORMAT` in
 * `@molecule/api-encryption`).
 *
 * The plaintext is cut into fixed-size chunks; each is sealed with its own
 * nonce (`noncePrefix || counter`) and AAD (`context || counter || final`), so
 * reordering, dropping, duplicating or truncating chunks fails authentication.
 * Neither direction holds more than about one chunk in memory.
 *
 * @module
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { Transform } from 'node:stream'

import { EncryptionStreamError } from '@molecule/api-encryption'

/** ASCII magic that opens every encrypted stream. */
export const STREAM_MAGIC = Buffer.from('MOLAEAD1', 'ascii')

/** Header length: magic (8) + key version (2) + chunk size (4) + nonce prefix (8). */
export const STREAM_HEADER_BYTES = 22

/** Default plaintext bytes per chunk (1 MiB). */
export const DEFAULT_STREAM_CHUNK_BYTES = 1024 * 1024

/** Smallest allowed chunk size (4 KiB). */
export const MIN_STREAM_CHUNK_BYTES = 4 * 1024

/** Largest allowed chunk size (16 MiB). */
export const MAX_STREAM_CHUNK_BYTES = 16 * 1024 * 1024

const ALGORITHM = 'aes-256-gcm'
const TAG_BYTES = 16
const NONCE_PREFIX_BYTES = 8
const MAX_COUNTER = 0xffffffff
const MAX_KEY_VERSION = 0xffff

/**
 * Builds the 12-byte nonce for one chunk.
 *
 * @param prefix - The stream's 8-byte random nonce prefix.
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
 * Builds the AAD for one chunk.
 *
 * @param context - UTF-8 bytes of the caller's context.
 * @param counter - The chunk counter.
 * @param final - Whether this is the last chunk.
 * @returns The chunk AAD.
 */
const chunkAad = (context: Buffer, counter: number, final: boolean): Buffer => {
  const tail = Buffer.alloc(5)
  tail.writeUInt32BE(counter, 0)
  tail[4] = final ? 1 : 0
  return Buffer.concat([context, tail])
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
  /** The 32-byte key to encrypt with. */
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
 * @throws {EncryptionStreamError} On an out-of-range chunk size or key version.
 */
export const createEncryptStream = (params: EncryptStreamParams): Transform => {
  const chunkBytes = params.chunkBytes ?? DEFAULT_STREAM_CHUNK_BYTES
  if (!validChunkBytes(chunkBytes)) {
    throw new EncryptionStreamError(
      `Stream chunk size must be a whole number of bytes between ${MIN_STREAM_CHUNK_BYTES} ` +
        `and ${MAX_STREAM_CHUNK_BYTES}; got ${chunkBytes}.`,
    )
  }
  if (!Number.isInteger(params.version) || params.version < 0 || params.version > MAX_KEY_VERSION) {
    throw new EncryptionStreamError(
      `Key version ${params.version} cannot be written into a stream header (0 to ${MAX_KEY_VERSION}).`,
    )
  }

  const { key } = params
  const context = Buffer.from(params.context ?? '', 'utf-8')
  const prefix = randomBytes(NONCE_PREFIX_BYTES)
  const pending = new ByteQueue()
  let counter = 0
  let headerSent = false

  const header = Buffer.alloc(STREAM_HEADER_BYTES)
  STREAM_MAGIC.copy(header, 0)
  header.writeUInt16BE(params.version, 8)
  header.writeUInt32BE(chunkBytes, 10)
  prefix.copy(header, 14)

  const seal = (plaintext: Buffer, final: boolean): Buffer => {
    if (counter > MAX_COUNTER) {
      throw new EncryptionStreamError(
        'The stream is too long to encrypt: it would need more than 2^32 chunks. Use a larger chunk size.',
      )
    }
    const cipher = createCipheriv(ALGORITHM, key, chunkNonce(prefix, counter), {
      authTagLength: TAG_BYTES,
    })
    cipher.setAAD(chunkAad(context, counter, final))
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
        callback(error as Error)
      }
    },
    flush(callback) {
      try {
        sendHeader(this)
        this.push(seal(pending.take(pending.length), true))
        callback()
      } catch (error) {
        callback(error as Error)
      }
    },
  })
}

/** Options for {@link createDecryptStream}. */
export interface DecryptStreamParams {
  /**
   * Returns the key for a header's key version, or throws a descriptive error
   * when that version is not available.
   */
  resolveKey: (version: number) => Buffer
  /** Optional AAD context; must match the one used to encrypt. */
  context?: string
}

/**
 * Creates a Transform that authenticates and decrypts the chunked framing.
 * Each chunk's plaintext is pushed only after its tag verifies.
 *
 * @param params - Key resolver and context.
 * @returns The decrypting Transform.
 */
export const createDecryptStream = (params: DecryptStreamParams): Transform => {
  const context = Buffer.from(params.context ?? '', 'utf-8')
  const pending = new ByteQueue()
  let key: Buffer | null = null
  let prefix: Buffer | null = null
  let recordBytes = 0
  let counter = 0

  const parseHeader = (header: Buffer): void => {
    if (!header.subarray(0, 8).equals(STREAM_MAGIC)) {
      throw new EncryptionStreamError(
        'This is not an encrypted stream (its header does not start with MOLAEAD1).',
      )
    }
    const version = header.readUInt16BE(8)
    const chunkBytes = header.readUInt32BE(10)
    if (!validChunkBytes(chunkBytes)) {
      throw new EncryptionStreamError(
        `The encrypted stream's header names an invalid chunk size (${chunkBytes} bytes).`,
      )
    }
    try {
      key = params.resolveKey(version)
    } catch (error) {
      throw new EncryptionStreamError((error as Error).message, { cause: error })
    }
    prefix = Buffer.from(header.subarray(14, STREAM_HEADER_BYTES))
    recordBytes = chunkBytes + TAG_BYTES
  }

  const open = (record: Buffer, final: boolean): Buffer => {
    if (counter > MAX_COUNTER) {
      throw new EncryptionStreamError('The encrypted stream has more than 2^32 chunks.')
    }
    const decipher = createDecipheriv(
      ALGORITHM,
      key as Buffer,
      chunkNonce(prefix as Buffer, counter),
      {
        authTagLength: TAG_BYTES,
      },
    )
    decipher.setAAD(chunkAad(context, counter, final))
    decipher.setAuthTag(record.subarray(record.length - TAG_BYTES))
    const body = decipher.update(record.subarray(0, record.length - TAG_BYTES))
    let tail: Buffer
    try {
      tail = decipher.final()
    } catch (error) {
      throw new EncryptionStreamError(
        `Chunk ${counter} of the encrypted stream failed authentication: the data was altered, ` +
          `chunks were reordered or cut, or the context or key does not match.`,
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
        callback(error as Error)
      }
    },
    flush(callback) {
      try {
        if (!key) {
          throw new EncryptionStreamError(
            'The encrypted stream ended before its header was complete.',
          )
        }
        if (pending.length < TAG_BYTES) {
          throw new EncryptionStreamError(
            `The encrypted stream was truncated: it ended after ${counter} chunk(s) without its final chunk.`,
          )
        }
        this.push(open(pending.take(pending.length), true))
        callback()
      } catch (error) {
        callback(error as Error)
      }
    },
  })
}
