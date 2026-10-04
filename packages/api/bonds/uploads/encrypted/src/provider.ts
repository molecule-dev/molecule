/**
 * Encrypting upload provider: encrypts every file before handing it to
 * another upload provider and decrypts it on the way back.
 *
 * @module
 */

import type { Transform } from 'node:stream'

import { trackBondFailure } from '@molecule/api-analytics'
import type { EncryptionProvider, EncryptStreamOptions } from '@molecule/api-encryption'
import { getProvider as getEncryptionProvider, hasStreamEncryption } from '@molecule/api-encryption'
import type { FileInfo, UploadedFile } from '@molecule/api-uploads'
import { UploadAbortedError } from '@molecule/api-uploads'

import type {
  EncryptedGetFileOptions,
  EncryptedUploadProvider,
  EncryptedUploadsConfig,
  ParsedEncryptedId,
} from './types.js'

/** Prefix every encrypted id starts with. The `1` is the id format version. */
export const ENCRYPTED_ID_PREFIX = 'enc1.' as const

/** Error name used when the encryption provider cannot encrypt streams. */
export const ENCRYPTION_UNAVAILABLE_ERROR_NAME = 'EncryptionUnavailableError' as const

/** Error name used when `getFile`'s `expectContext` differs from the id's context. */
export const ENCRYPTION_CONTEXT_MISMATCH_ERROR_NAME = 'EncryptionContextMismatchError' as const

/** Error name used when the `context` function returns an unusable value. */
export const INVALID_ENCRYPTION_CONTEXT_ERROR_NAME = 'InvalidEncryptionContextError' as const

const BOND = 'uploads-encrypted'

const BASE64URL = /^[A-Za-z0-9_-]+$/

/**
 * Creates an error with a given `name`.
 *
 * @param name - The error name.
 * @param message - Plain-English description (never plaintext, keys or ciphertext).
 * @param cause - Optional underlying error.
 * @returns The error.
 */
const namedError = (name: string, message: string, cause?: unknown): Error => {
  const error = new Error(message, cause === undefined ? undefined : { cause })
  error.name = name
  return error
}

/**
 * Encodes an encrypted id from its context and the inner provider's id.
 *
 * @param context - The context (AAD) the file was encrypted with.
 * @param innerId - The inner provider's id for the ciphertext object.
 * @returns The encrypted id.
 */
export const encodeEncryptedId = (context: string, innerId: string): string =>
  `${ENCRYPTED_ID_PREFIX}${Buffer.from(context, 'utf8').toString('base64url')}.${innerId}`

/**
 * Decodes an encrypted id.
 *
 * @param id - Any file id.
 * @returns The inner id and context, or `null` when `id` is not an encrypted id.
 */
export const parseEncryptedId = (id: string): ParsedEncryptedId | null => {
  if (typeof id !== 'string' || !id.startsWith(ENCRYPTED_ID_PREFIX)) return null
  const rest = id.slice(ENCRYPTED_ID_PREFIX.length)
  const dot = rest.indexOf('.')
  if (dot <= 0 || dot === rest.length - 1) return null
  const encodedContext = rest.slice(0, dot)
  if (!BASE64URL.test(encodedContext)) return null
  return {
    context: Buffer.from(encodedContext, 'base64url').toString('utf8'),
    innerId: rest.slice(dot + 1),
  }
}

/**
 * Returns a promise that is already rejected but marked handled, so a caller
 * that never awaits `uploadPromise` does not trigger an unhandled rejection.
 *
 * @param error - The rejection reason.
 * @returns The rejected promise.
 */
const handledRejection = (error: Error): Promise<void> => {
  const promise = Promise.reject(error)
  promise.catch((_error: unknown) => {
    // Intentionally ignored here: the same promise is returned to the caller,
    // who observes the rejection; this handler only marks it as handled.
  })
  return promise
}

/** Per-upload state, keyed by the File this provider returned. */
interface UploadState {
  innerFile: UploadedFile | undefined
  cipher: Transform
  aborted: boolean
  settle: (error?: Error) => void
}

/**
 * Creates an upload provider that encrypts every file before `config.inner`
 * stores it and decrypts it on read, so the store never sees plaintext.
 *
 * @param config - The inner provider, and optionally the encryption provider,
 *   the per-file context function and the chunk size.
 * @returns The encrypting upload provider.
 */
export const createProvider = (config: EncryptedUploadsConfig): EncryptedUploadProvider => {
  const { inner } = config
  const uploads = new WeakMap<UploadedFile, UploadState>()

  /**
   * Resolves the encryption provider and checks it can encrypt streams.
   *
   * @returns The stream-capable provider.
   * @throws {Error} `EncryptionUnavailableError` when none is bonded or it lacks streams.
   */
  const resolveEncryption = (): EncryptionProvider &
    Required<Pick<EncryptionProvider, 'encryptStream' | 'decryptStream'>> => {
    let encryption: EncryptionProvider
    try {
      encryption = config.encryption ?? getEncryptionProvider()
    } catch (error) {
      throw namedError(
        ENCRYPTION_UNAVAILABLE_ERROR_NAME,
        'No encryption provider is bonded; bond one with stream encryption, e.g. @molecule/api-encryption-aes.',
        error,
      )
    }
    if (!hasStreamEncryption(encryption)) {
      throw namedError(
        ENCRYPTION_UNAVAILABLE_ERROR_NAME,
        'The bonded encryption provider has no stream encryption; bond one that does, e.g. @molecule/api-encryption-aes.',
      )
    }
    return encryption
  }

  const upload = (
    fieldname: string,
    stream: NodeJS.ReadableStream,
    info: FileInfo,
    onError: (error: Error) => void,
  ): UploadedFile => {
    const failedFile = (error: Error): UploadedFile => {
      trackBondFailure({ bond: BOND, operation: 'upload', error })
      // Drain and discard the plaintext so a multipart parser waiting on this
      // stream does not stall; none of it is stored anywhere.
      stream.resume()
      onError(error)
      return {
        id: '',
        fieldname,
        filename: info.filename,
        encoding: info.encoding,
        mimetype: info.mimeType,
        size: 0,
        uploaded: false,
        uploadPromise: handledRejection(error),
      }
    }

    let cipher: Transform
    let context: string
    try {
      const encryption = resolveEncryption()
      context = config.context
        ? config.context({ fieldname, filename: info.filename, mimeType: info.mimeType })
        : fieldname
      if (typeof context !== 'string' || context.length === 0) {
        throw namedError(
          INVALID_ENCRYPTION_CONTEXT_ERROR_NAME,
          'The encryption context must be a non-empty string.',
        )
      }
      const options: EncryptStreamOptions & { chunkBytes?: number } = { context }
      if (config.chunkBytes !== undefined) options.chunkBytes = config.chunkBytes
      cipher = encryption.encryptStream(options)
    } catch (error) {
      return failedFile(error instanceof Error ? error : new Error(String(error)))
    }

    let errorReported = false
    const reportError = (error: Error): void => {
      if (errorReported) return
      errorReported = true
      onError(error)
    }

    let settled = false
    let resolveUpload!: () => void
    let rejectUpload!: (error: Error) => void
    const uploadPromise = new Promise<void>((resolve, reject) => {
      resolveUpload = resolve
      rejectUpload = reject
    })
    const settle = (error?: Error): void => {
      if (settled) return
      settled = true
      if (error) rejectUpload(error)
      else resolveUpload()
    }

    // `state` exists before inner.upload() runs: a provider may call onError
    // synchronously (e.g. a blocked MIME type) before it returns.
    const state: UploadState = { innerFile: undefined, cipher, aborted: false, settle }
    // Registered BEFORE inner.upload() so it runs before the inner provider's
    // own listener on the same stream: the encrypt failure is what is reported.
    const onEncryptError = (error: Error): void => {
      if (state.aborted || settled) return
      trackBondFailure({ bond: BOND, operation: 'encrypt', error })
      reportError(error)
      settle(error)
      // Best effort: remove whatever partial ciphertext the inner provider wrote.
      Promise.resolve()
        .then(() => (state.innerFile ? inner.abortUpload(state.innerFile) : undefined))
        .catch((_abortError: unknown) => {
          // Intentionally ignored: the upload has already failed with the
          // encryption error above, which is what the caller must see; a
          // failed cleanup of a partial ciphertext object adds nothing to it.
        })
    }

    cipher.on('error', onEncryptError)
    const innerFile = inner.upload(fieldname, cipher, info, (error) => {
      if (state.aborted) return
      reportError(error)
      settle(error)
      // The inner provider stopped reading; drain so the source does not stall.
      cipher.resume()
    })
    state.innerFile = innerFile

    stream.on('error', (error: Error) => {
      cipher.destroy(error)
    })
    stream.pipe(cipher)

    const innerDone: Promise<void> =
      innerFile.uploadPromise ??
      new Promise<void>((resolve, reject) => {
        cipher.once('end', () => resolve())
        cipher.once('error', reject)
      })
    innerDone.then(
      () => settle(),
      (error: unknown) => settle(error instanceof Error ? error : new Error(String(error))),
    )
    uploadPromise.catch((_error: unknown) => {
      // Intentionally ignored here: `uploadPromise` is handed to the caller,
      // who observes the rejection; this only marks it handled for callers
      // that rely on `onError` instead of awaiting.
    })

    const file: UploadedFile = {
      get id() {
        return innerFile.id ? encodeEncryptedId(context, innerFile.id) : ''
      },
      fieldname,
      filename: info.filename,
      encoding: info.encoding,
      mimetype: info.mimeType,
      get size() {
        return innerFile.size
      },
      get uploaded() {
        return innerFile.uploaded
      },
      get location() {
        return innerFile.location
      },
      stream,
      uploadPromise,
    }
    uploads.set(file, state)
    return file
  }

  const abortUpload = async (file: UploadedFile): Promise<void> => {
    const state = uploads.get(file)
    if (!state) {
      const parsed = parseEncryptedId(file.id)
      await inner.abortUpload(parsed ? { ...file, id: parsed.innerId } : file)
      return
    }
    state.aborted = true
    try {
      if (state.innerFile) await inner.abortUpload(state.innerFile)
    } finally {
      state.cipher.destroy()
      state.settle(new UploadAbortedError())
    }
  }

  const getFile = async (
    id: string,
    options?: EncryptedGetFileOptions,
  ): Promise<NodeJS.ReadableStream | null> => {
    if (!inner.getFile) {
      throw new Error('The inner upload provider does not implement getFile.')
    }
    const parsed = parseEncryptedId(id)
    if (!parsed) {
      // Legacy plaintext object stored before encryption was enabled.
      return inner.getFile(id)
    }
    if (options?.expectContext !== undefined && options.expectContext !== parsed.context) {
      throw namedError(
        ENCRYPTION_CONTEXT_MISMATCH_ERROR_NAME,
        'The file id carries a different encryption context than the one expected.',
      )
    }
    const encryption = resolveEncryption()
    const source = await inner.getFile(parsed.innerId)
    if (!source) return null

    const decipher = encryption.decryptStream({ context: parsed.context })
    decipher.on('error', (error: Error) => {
      trackBondFailure({ bond: BOND, operation: 'decrypt', error })
    })
    source.on('error', (error: Error) => {
      decipher.destroy(error)
    })
    decipher.on('close', () => {
      const closable = source as NodeJS.ReadableStream & { destroy?: () => void }
      if (typeof closable.destroy === 'function') closable.destroy()
    })
    source.pipe(decipher)
    return decipher
  }

  const deleteFile = async (id: string): Promise<void> => {
    const parsed = parseEncryptedId(id)
    await inner.deleteFile(parsed ? parsed.innerId : id)
  }

  return {
    inner,
    upload,
    abortUpload,
    getFile,
    deleteFile,
    parseId: parseEncryptedId,
    isEncryptedId: (id: string): boolean => parseEncryptedId(id) !== null,
  }
}
