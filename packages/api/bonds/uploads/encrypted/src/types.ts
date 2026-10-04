/**
 * Type definitions for the encrypting upload provider.
 *
 * @module
 */

import type { EncryptionProvider } from '@molecule/api-encryption'
import type { FileInfo, UploadedFile, UploadProvider } from '@molecule/api-uploads'

/**
 * What the `context` function is told about each file.
 */
export interface EncryptedUploadContextInfo {
  /** The form field name the file was submitted under. */
  fieldname: string
  /** The original filename. */
  filename: string
  /** The file's MIME type. */
  mimeType: string
}

/**
 * Configuration for {@link EncryptedUploadProvider}.
 */
export interface EncryptedUploadsConfig {
  /** The upload provider that stores the ciphertext (S3, filesystem, a mirror…). */
  inner: UploadProvider

  /**
   * The encryption provider to use. Defaults to the provider bonded to
   * `@molecule/api-encryption`, resolved lazily on every call (so it may be
   * bonded after this provider is created). It must implement stream
   * encryption (`encryptStream`/`decryptStream`).
   */
  encryption?: EncryptionProvider

  /**
   * Returns the additional authenticated data (AAD) bound to a file. The same
   * string is required to decrypt it, and it is stored — readable — in the
   * file's id, so never put a secret in it. Must return a non-empty string.
   * Defaults to the file's `fieldname`.
   */
  context?: (info: EncryptedUploadContextInfo) => string

  /**
   * Plaintext bytes per authenticated chunk, passed to `encryptStream` for
   * providers that accept it (the AES bond allows 4 KiB to 16 MiB). Omit to
   * use the encryption provider's default.
   */
  chunkBytes?: number
}

/**
 * Options for {@link EncryptedUploadProvider.getFile}.
 */
export interface EncryptedGetFileOptions {
  /**
   * The context the caller expects this file to carry. When it differs from
   * the context stored in the id, `getFile` throws an
   * `EncryptionContextMismatchError` before reading anything. Ignored for
   * legacy (non-encrypted) ids, which carry no context.
   */
  expectContext?: string
}

/**
 * The decoded parts of an encrypted file id.
 */
export interface ParsedEncryptedId {
  /** The id the inner provider assigned to the ciphertext object. */
  innerId: string
  /** The context (AAD) the file was encrypted with. */
  context: string
}

/**
 * An upload provider that encrypts every file before handing it to `inner`
 * and decrypts it on the way back.
 */
export interface EncryptedUploadProvider extends UploadProvider {
  /** The provider that stores the ciphertext. */
  readonly inner: UploadProvider

  /**
   * Encrypts `stream` and uploads the ciphertext through `inner`. The returned
   * file's `id` is an encrypted id (`enc1.<base64url context>.<inner id>`);
   * its `size` is the CIPHERTEXT size the inner provider reports.
   */
  upload(
    fieldname: string,
    stream: NodeJS.ReadableStream,
    info: FileInfo,
    onError: (error: Error) => void,
  ): UploadedFile

  /** Aborts an in-progress upload, passing through to `inner`. */
  abortUpload(file: UploadedFile): Promise<void>

  /**
   * Returns a stream of the decrypted file, `null` when the inner provider has
   * no such object. Tampering, a wrong context or truncation surface as an
   * `EncryptionStreamError` on the returned stream.
   */
  getFile(id: string, options?: EncryptedGetFileOptions): Promise<NodeJS.ReadableStream | null>

  /** Deletes the stored object through `inner`. */
  deleteFile(id: string): Promise<void>

  /** Decodes an encrypted id; `null` for a non-encrypted (legacy) id. */
  parseId(id: string): ParsedEncryptedId | null

  /** Whether `id` is an encrypted id produced by this provider. */
  isEncryptedId(id: string): boolean
}
