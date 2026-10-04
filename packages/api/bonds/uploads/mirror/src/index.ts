/**
 * Mirrored upload provider for molecule.dev — one `UploadProvider` that writes every
 * file to several upload providers and reads it back from whichever has it.
 *
 * @remarks
 * Bond the result of `createProvider({ targets })` as the uploads provider (see
 * `@molecule/api-uploads` for the handler pattern). Each target is any other uploads
 * bond — two S3-compatible stores in different regions or accounts, S3 plus the
 * filesystem, and so on.
 *
 * - **Writes stream once to every target.** The source is read a single time and teed
 *   to each target through its own `PassThrough`; the slowest target sets the pace
 *   (backpressure), and nothing buffers the whole file.
 * - **Required vs optional targets.** `required` defaults to `true`. If a REQUIRED target
 *   fails, `onError` is called with its error, the copies that did succeed elsewhere are
 *   deleted (best-effort), and `uploadPromise` rejects. If an OPTIONAL target fails, the
 *   upload still succeeds without that copy; the failure goes to `onTargetFailure` and to
 *   `trackBondFailure` (`bond.failure uploads-mirror upload …`). An upload where no target
 *   stored a copy always fails.
 * - **The id is opaque. Store it and pass it back unchanged.** It records which target
 *   holds which copy (format `mir1.<base64url>`, a single URL-safe token). Read `file.id`
 *   AFTER `uploadPromise` resolves: when an optional target failed, the final id leaves
 *   that copy out.
 * - **Reads go in CONFIG order**, not the order inside the id. A target that returns a
 *   stream wins; a target that reports the file missing (`null`) is skipped; a target that
 *   THROWS is reported and skipped. `getFile` returns `null` only when every copy was
 *   missing — if any target threw and none served, it throws the first error (an outage
 *   is not "missing"). A target with no `getFile`, or one the id names but the config no
 *   longer lists, counts as a failure, never as missing.
 * - **Files stored before mirroring keep working.** A raw (non-mirror) id is read from the
 *   first target that returns it, with the same error rules, and `deleteFile` tries it on
 *   every target. That is the migration path: keep the provider that stored them, under
 *   its existing configuration, as one of the targets, and existing ids resolve unchanged.
 * - **`deleteFile`** deletes every copy concurrently and throws when a required target
 *   failed (including a provider that throws for an object it does not have — the mirror
 *   cannot tell a provider's "missing" error from a real one). Optional-target failures are
 *   reported, not thrown.
 * - **`abortUpload`** aborts every target; `uploadPromise` rejects with `UploadAbortedError`
 *   and `onError` is not called, per the `@molecule/api-uploads` abort contract.
 * - **`locate(id)`** says which targets still hold a copy, using a target's `headFile`
 *   when it has one (as `@molecule/api-uploads-s3` does) and `'unknown'` otherwise.
 * - **This bond does NOT encrypt.** Every target stores the bytes it is given. For
 *   encryption at rest, wrap targets with `@molecule/api-uploads-encrypted`.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-uploads'
 * import { createProvider as createMirror } from '@molecule/api-uploads-mirror'
 * import { createProvider as createS3 } from '@molecule/api-uploads-s3'
 *
 * const primary = createS3({
 *   bucket: process.env.PRIMARY_S3_BUCKET!,
 *   region: process.env.PRIMARY_S3_REGION,
 * })
 * const offsite = createS3({
 *   bucket: process.env.OFFSITE_S3_BUCKET!,
 *   endpoint: process.env.OFFSITE_S3_ENDPOINT,
 *   credentials: {
 *     accessKeyId: process.env.OFFSITE_S3_ACCESS_KEY_ID!,
 *     secretAccessKey: process.env.OFFSITE_S3_SECRET_ACCESS_KEY!,
 *   },
 * })
 *
 * setProvider(
 *   createMirror({
 *     targets: [
 *       { name: 'primary', provider: primary },
 *       { name: 'offsite', provider: offsite, required: false },
 *     ],
 *     onTargetFailure: ({ target, operation, error }) =>
 *       console.warn(`uploads mirror: ${target} failed to ${operation}`, error),
 *   }),
 * )
 * ```
 *
 * @module
 */

export * from './id.js'
export * from './provider.js'
export * from './types.js'
