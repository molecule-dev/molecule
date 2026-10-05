/**
 * Encrypting upload provider for molecule.dev.
 *
 * Wraps any other upload provider: every file is encrypted before the inner
 * provider stores it and decrypted on the way back, so the store (S3, R2, a
 * disk, a mirror) never sees plaintext.
 *
 * @remarks
 * - **What is stored.** The ciphertext uses the `mol-aead-chunked-v2` framing
 *   from `@molecule/api-encryption` (`ENCRYPTED_STREAM_FORMAT`): a header, then
 *   independently authenticated chunks. A flipped bit, reordered or dropped
 *   chunks, a wrong context and a truncated object all fail authentication. The
 *   AES bond's objects start with the `MOLAEAD2` magic.
 * - **Needs stream encryption.** The encryption provider (by default the one
 *   bonded to `@molecule/api-encryption`, resolved on every call) must implement
 *   `encryptStream`/`decryptStream` — e.g. `@molecule/api-encryption-aes`. If it
 *   does not, `upload()` reports an `EncryptionUnavailableError` through
 *   `onError`, rejects `uploadPromise`, and stores nothing. It NEVER falls back
 *   to storing plaintext.
 * - **Ids.** `upload()` returns ids of the form
 *   `enc1.<base64url(utf8 context)>.<inner id>`. Store and pass them back
 *   unchanged; they are opaque. The context is IN the id so `getFile(id)` can
 *   supply the same additional authenticated data, which means the id reveals
 *   the context string. Choose contexts that are fine to appear in a private
 *   object key (`backup:<projectId>`, the form fieldname) — never a secret. The
 *   context defaults to the fieldname; pass `context: (info) => string` to bind
 *   files to something more specific (the context must be non-empty).
 * - **A cut upload is a failed upload.** A multipart parser's size limit
 *   (busboy's `limit` event, after which the stream ends normally) and a source
 *   that closes before it ends both fail the upload — `onError` with an
 *   `UploadTooLargeError` / `UploadSourceClosedError`, `uploadPromise` rejects,
 *   the partial ciphertext is removed — rather than sealing the truncated body
 *   as a complete object.
 * - **What the inner store sees.** The filename and MIME type travel to the inner
 *   provider as given (an S3 store keeps the MIME type as the object's content
 *   type); only the bytes are encrypted.
 * - **Reading.** `getFile(id)` returns a stream of plaintext. Plaintext is
 *   released one chunk at a time, only after that chunk's tag verifies; on
 *   tampering, a wrong context or truncation the returned stream is destroyed
 *   with an `EncryptionStreamError`, so always handle its `error` event (or use
 *   `stream/promises` `pipeline`) and discard partial output on error. Its
 *   `code` separates a damaged object (`auth`) from a key configuration
 *   problem (`unknown-key`, `unknown-key-version`) and an early end that may
 *   be transport (`truncated`).
 *   `getFile(id, { expectContext })` throws an `EncryptionContextMismatchError`
 *   before reading anything when the id was written under a different context
 *   — use it when the caller knows which object this must be.
 * - **Sizes.** A file's `size` is the CIPHERTEXT size the inner provider
 *   reports (slightly larger than the plaintext). Track the plaintext size
 *   yourself if you need it.
 * - **Migration from plaintext.** An id without the `enc1.` prefix is treated
 *   as a legacy plaintext object stored before this provider was bonded:
 *   `getFile`, `deleteFile` and `abortUpload` pass it to the inner provider
 *   unchanged (an `expectContext` is accepted but there is nothing to check).
 *   New uploads are always encrypted; use `isEncryptedId(id)` to find the legacy
 *   ones and re-upload them to encrypt them.
 * - **Key rotation** is the encryption bond's job: rotate there and keep the
 *   old keys available (the AES bond's `priorKeys`), and existing objects stay
 *   readable — the key version travels in each object's header.
 * - **Composes with `@molecule/api-uploads-mirror`.** Wrap the mirror —
 *   `createProvider({ inner: mirror })` — so encryption happens once and every
 *   copy holds the same ciphertext.
 * - Errors never include plaintext, keys or ciphertext. Failures are reported
 *   to `@molecule/api-analytics` as `bond.failure` (`uploads-encrypted`).
 *
 * @example
 * ```ts
 * import { setProvider } from '@molecule/api-uploads'
 * import { createProvider } from '@molecule/api-uploads-encrypted'
 * import { createProvider as createS3Provider } from '@molecule/api-uploads-s3'
 *
 * const s3Provider = createS3Provider({ bucket: 'my-app-files' })
 *
 * // Uses the encryption provider bonded to @molecule/api-encryption
 * // (e.g. @molecule/api-encryption-aes) for every file.
 * const encrypted = createProvider({
 *   inner: s3Provider,
 *   context: ({ fieldname }) => fieldname,
 * })
 *
 * setProvider(encrypted)
 *
 * // Later: read a file back as plaintext, asserting which object it must be.
 * const stream = await encrypted.getFile('enc1.YXZhdGFy.3f1c…', { expectContext: 'avatar' })
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
