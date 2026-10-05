/**
 * AWS S3 upload provider implementation.
 *
 * Handles file uploads to AWS S3 and S3-compatible stores. `createProvider()`
 * builds an independent provider per store; the exported `provider` (and the
 * module-level `upload`/`abortUpload`/`deleteFile`/`getFile`/`s3Client`) is the
 * default, env-configured instance.
 *
 * @module
 */

import type { ChecksumAlgorithm, StorageClass } from '@aws-sdk/client-s3'
import {
  DeleteObjectCommand,
  GetBucketVersioningCommand,
  GetObjectCommand,
  GetObjectLockConfigurationCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { PassThrough } from 'stream'
import { v4 as uuid } from 'uuid'

import { trackBondFailure } from '@molecule/api-analytics'
import { getLogger } from '@molecule/api-bond'
import { getProxyAgents } from '@molecule/api-proxy-agent'
import type { FileInfo, UploadProvider } from '@molecule/api-uploads'
import { UploadAbortedError } from '@molecule/api-uploads'
const logger = getLogger()
// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import { t } from '@molecule/api-i18n'

import type { File, ObjectLockRetentionMode, S3UploadsConfig } from './types.js'

/**
 * Metadata of a stored object, as returned by `headFile()`.
 */
export interface S3FileHead {
  /** Object size in bytes. */
  bytes: number
  /** The object's ETag, when the store returns one. */
  etag?: string
  /** When the object was last written, when the store returns it. */
  lastModified?: Date
}

/**
 * A bucket's protection against overwrite and deletion, as reported by
 * `describeBucketProtection()`.
 */
export interface BucketProtection {
  /** Bucket versioning state; `'off'` when versioning was never enabled. */
  versioning: 'Enabled' | 'Suspended' | 'off'
  /** The bucket's Object Lock configuration. */
  objectLock: {
    /** Whether Object Lock is enabled on the bucket. */
    enabled: boolean
    /** Mode of the bucket's default retention rule, when one is set. */
    mode?: ObjectLockRetentionMode
    /** Default retention in days, when the rule is expressed in days. */
    days?: number
    /** Default retention in years, when the rule is expressed in years. */
    years?: number
  }
  /** ISO-8601 time the bucket was checked. */
  checkedAt: string
}

/**
 * Checks a bucket's reported protection against a required minimum: versioning
 * `Enabled`, Object Lock enabled, a default retention mode at least as strict as
 * wanted (`COMPLIANCE` satisfies a `GOVERNANCE` want, not the reverse) and a
 * default retention of at least `minDays` (years count as 365 days).
 * @param protection - The result of `describeBucketProtection()`.
 * @param want - The required mode and minimum default retention in days.
 * @param want.mode - The weakest acceptable default retention mode.
 * @param want.minDays - The shortest acceptable default retention, in days.
 * @returns `ok`, and one plain-language reason per unmet requirement.
 */
export function bucketProtectionMeets(
  protection: BucketProtection,
  want: { mode: ObjectLockRetentionMode; minDays: number },
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (protection.versioning !== 'Enabled') {
    reasons.push(`versioning is ${protection.versioning}, not Enabled`)
  }
  const lock = protection.objectLock
  if (!lock.enabled) {
    reasons.push('object lock is not enabled on the bucket')
  } else {
    if (!lock.mode) {
      reasons.push('the bucket has no default retention rule')
    } else if (want.mode === 'COMPLIANCE' && lock.mode !== 'COMPLIANCE') {
      reasons.push(`default retention mode is ${lock.mode}, COMPLIANCE is required`)
    }
    const days = (lock.days ?? 0) + (lock.years ?? 0) * 365
    if (lock.mode && days < want.minDays) {
      reasons.push(`default retention is ${days} days, at least ${want.minDays} are required`)
    }
  }
  return { ok: reasons.length === 0, reasons }
}

/**
 * An S3 upload provider bound to one store. Implements `UploadProvider` and
 * also exposes its client, its bucket and a metadata lookup.
 */
export interface S3UploadProvider extends UploadProvider {
  /** The store's S3 client (created on first use). */
  readonly client: S3Client
  /** The bucket this provider reads and writes. */
  readonly bucket: string
  /**
   * Streams a file into this store under a newly minted key (prefixed with `keyPrefix` when set).
   * @param fieldname - The form field name this file was submitted under.
   * @param stream - The readable stream of the file data.
   * @param info - File metadata (filename, encoding, mimeType).
   * @param onError - Called if the upload fails or the stream exceeds its size limit.
   * @returns The file record; its `id` is the full object key.
   */
  upload(
    fieldname: string,
    stream: NodeJS.ReadableStream,
    info: FileInfo,
    onError: (error: Error) => void,
  ): File
  /**
   * Aborts an in-progress upload; its `uploadPromise` rejects with `UploadAbortedError`.
   * @param file - The file record returned by `upload()`.
   */
  abortUpload(file: File): Promise<void>
  /**
   * Downloads a file.
   * @param id - The file id returned by `upload()`.
   * @returns A readable stream, or `null` if the file does not exist.
   */
  getFile(id: string): Promise<NodeJS.ReadableStream | null>
  /**
   * Looks up an object's size, ETag and modification time without downloading it.
   * @param id - The file id returned by `upload()` (includes any `keyPrefix`).
   * @returns The object's metadata, or `null` if it does not exist.
   */
  headFile(id: string): Promise<S3FileHead | null>
  /**
   * Reads the bucket's versioning state and Object Lock configuration (including
   * its default retention), so an app can assert at boot and periodically that an
   * immutable bucket is still immutable. A bucket with no Object Lock
   * configuration reports `objectLock.enabled: false`; any other failure (auth,
   * missing bucket, network) throws.
   * @returns The bucket's protection.
   */
  describeBucketProtection(): Promise<BucketProtection>
}

/**
 * Read a positive millisecond value from the environment.
 *
 * @param name - Environment variable name.
 * @param fallback - Value used when unset or not a positive number.
 * @returns The milliseconds.
 */
function envMs(name: string, fallback: number): number {
  const n = Number(process.env[name])
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/**
 * Returns the S3 bucket name from the environment.
 *
 * `BUCKET_NAME` is accepted alongside `AWS_S3_BUCKET` because that is what
 * `fly storage create` (Tigris) exports. Without it, following a provider's own
 * setup flow leaves this empty and every upload fails a bucket-not-set check
 * despite the bucket existing and the credentials being correct.
 *
 * @returns The bucket name, or an empty string if not set.
 */
function getBucketName(): string {
  return process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME || ''
}

/**
 * Builds the store configuration the default `provider` uses, from the environment.
 *
 * Reads `AWS_S3_BUCKET` (or `BUCKET_NAME`), `AWS_S3_ENDPOINT` (or
 * `AWS_ENDPOINT_URL_S3`), `AWS_S3_REGION` (or `AWS_REGION`, default
 * `us-east-1`), `AWS_S3_FORCE_PATH_STYLE`, `AWS_S3_CONNECTION_TIMEOUT_MS` and
 * `AWS_S3_SOCKET_TIMEOUT_MS`. Credentials are deliberately left unset so the AWS
 * SDK's own chain (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, profiles, roles)
 * resolves them.
 *
 * @returns A snapshot of the env-driven configuration.
 */
export function configFromEnv(): S3UploadsConfig {
  // Optional endpoint + path-style overrides let this provider target an
  // S3-compatible service (Cloudflare R2, MinIO, DigitalOcean Spaces, Tigris,
  // or a credential broker). When no endpoint is set the SDK resolves the
  // default AWS regional endpoint and `AWS_S3_FORCE_PATH_STYLE` defaults to
  // the SDK's virtual-hosted-style addressing, so behaviour is unchanged.
  //
  // `AWS_ENDPOINT_URL_S3` is accepted as well because that is the name the AWS
  // SDKs themselves standardised for a per-service endpoint override, and it
  // is what provisioning tools export — `fly storage create` (Tigris) sets
  // exactly this. Reading only `AWS_S3_ENDPOINT` meant following a provider's
  // own setup flow produced an env the bond never looked at: uploads silently
  // fell back to the AWS regional endpoint and failed against a bucket that
  // does not live there.
  const endpoint = process.env.AWS_S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3
  return {
    bucket: getBucketName(),
    region: process.env.AWS_S3_REGION || process.env.AWS_REGION || 'us-east-1',
    ...(endpoint ? { endpoint } : {}),
    ...(process.env.AWS_S3_FORCE_PATH_STYLE === 'true' ? { forcePathStyle: true } : {}),
    connectionTimeoutMs: envMs('AWS_S3_CONNECTION_TIMEOUT_MS', 10_000),
    socketTimeoutMs: envMs('AWS_S3_SOCKET_TIMEOUT_MS', 60_000),
    maxAttempts: 3,
  }
}

/**
 * Builds an `S3Client` for one store configuration.
 * @param config - The store configuration.
 * @returns A new client.
 */
function buildClient(config: S3UploadsConfig): S3Client {
  const region = config.region || 'us-east-1'
  const endpoint = config.endpoint
  // The AWS SDK v3 builds its own `https.Agent` and reads no proxy variable
  // (`NODE_USE_ENV_PROXY` does not reach it either — it never goes through
  // Node's proxy-aware paths), so on a host whose only egress path is a proxy
  // every upload failed with a bare connection error. `requestHandler` takes
  // NodeHttpHandler OPTIONS, so the agent goes in with no `@smithy/*`
  // dependency. Resolved against the endpoint actually in use, which matters
  // here more than anywhere: an S3-compatible endpoint is often an internal
  // `http://` host (MinIO, a credential broker) that NO_PROXY exempts, and
  // proxying it would break a deployment that works today.
  const proxy = getProxyAgents(endpoint || `https://s3.${region}.amazonaws.com`)
  return new S3Client({
    region,
    ...(endpoint ? { endpoint } : {}),
    ...(config.forcePathStyle ? { forcePathStyle: true } : {}),
    ...(config.credentials ? { credentials: { ...config.credentials } } : {}),
    // 'none' opts this store out of the SDK's automatic CRC32 trailer (for an
    // S3-compatible store that rejects it); otherwise the SDK default applies.
    ...(config.checksumAlgorithm === 'none'
      ? { requestChecksumCalculation: 'WHEN_REQUIRED' as const }
      : {}),
    // Without timeouts a hung S3 socket stalls the caller forever. `socketTimeout`
    // is an inactivity timeout that destroys a stalled socket (large transfers
    // that keep moving are unaffected). `requestTimeout` is deliberately unset:
    // it is a total-time cap that only warns unless `throwOnRequestTimeout` is on,
    // and enabling that would kill legitimate large uploads. Plain handler options
    // merge with the proxy agents; no `@smithy/*` dependency is needed.
    requestHandler: {
      ...proxy,
      connectionTimeout: config.connectionTimeoutMs ?? 10_000,
      socketTimeout: config.socketTimeoutMs ?? 60_000,
    },
    maxAttempts: config.maxAttempts ?? 3,
  })
}

/**
 * Message for an upload attempted with no bucket configured.
 * @param envDriven - Whether the configuration came from the environment.
 * @returns The error message.
 */
function missingBucketMessage(envDriven: boolean): string {
  return envDriven
    ? 'AWS_S3_BUCKET is not set — set it to the S3 bucket name for uploads (see @molecule/api-uploads-s3 secrets).'
    : 'S3 bucket is not set — pass `bucket` to createProvider() (@molecule/api-uploads-s3).'
}

/**
 * Builds a provider over a configuration whose `bucket` is read at every
 * operation (so the env-driven default keeps reading the env per call) and whose
 * client options are read once, on first client use.
 * @param config - The store configuration (may expose `bucket` as a getter).
 * @param envDriven - Whether the configuration came from the environment (selects the missing-bucket message).
 * @returns The provider.
 */
function buildProvider(config: S3UploadsConfig, envDriven: boolean): S3UploadProvider {
  let client: S3Client | null = null

  /**
   * Returns this store's lazily-created client.
   * @returns The client.
   */
  const getClient = (): S3Client => {
    if (!client) client = buildClient(config)
    return client
  }

  const upload = (
    fieldname: string,
    stream: NodeJS.ReadableStream,
    info: FileInfo,
    onError: (error: Error) => void,
  ): File => {
    const id = `${config.keyPrefix ?? ''}${uuid()}`

    const filename = info.filename.substring(0, 1023)
    const encoding = info.encoding.substring(0, 1023)
    const mimetype = info.mimeType.substring(0, 255)

    // Block dangerous MIME types that could enable XSS if served directly.
    // [M4-1] Keep this set in lockstep with bonds/uploads/filesystem/src/provider.ts so the
    // two swappable providers enforce an identical contract.
    const BLOCKED_MIME_TYPES = new Set([
      'text/html',
      'application/xhtml+xml',
      'application/javascript',
      'text/javascript',
      'application/x-javascript',
      'image/svg+xml',
      'text/xml',
      'application/xml',
    ])
    if (BLOCKED_MIME_TYPES.has(mimetype.toLowerCase())) {
      // Drain the rejected stream: an unconsumed file stream stalls the multipart
      // parser (busboy pauses on backpressure), which hangs the whole request even
      // after the handler has responded with the 4xx.
      stream.resume()
      const error = new Error(`File type ${mimetype} is not allowed for upload`)
      onError(error)
      return { id, fieldname, filename, encoding, mimetype, size: 0, uploaded: false } as File
    }

    const bucket = config.bucket
    if (!bucket) {
      // Fail fast with an actionable message: with an empty Bucket the SDK rejects
      // later with a cryptic serialization error that never names the missing setting.
      stream.resume()
      onError(new Error(missingBucketMessage(envDriven)))
      return { id, fieldname, filename, encoding, mimetype, size: 0, uploaded: false } as File
    }

    // Pipe through a PassThrough the bond controls: `@aws-sdk/lib-storage`
    // consumes its Body without emitting `data` events on the source, so
    // counting bytes directly on `stream` never fired and `file.size` stayed 0
    // (caught by the capability contract tests). Piping puts the source in
    // flowing mode — its `data` listeners (size accounting below) now fire —
    // while the SDK reads from the PassThrough.
    const body = new PassThrough()
    stream.pipe(body)

    // Object Lock retention is computed per upload, from the moment it starts.
    // A lock PUT needs a checksum; with no explicit algorithm, CRC32 is named
    // outright so an env-level WHEN_REQUIRED setting cannot drop it.
    const checksum =
      config.checksumAlgorithm && config.checksumAlgorithm !== 'none'
        ? config.checksumAlgorithm
        : config.objectLock
          ? 'CRC32'
          : undefined
    const s3Upload = new Upload({
      client: getClient(),
      // The multipart part size bounds the largest object: 10,000 parts × the
      // part size (5 MiB by default, ~48.8 GiB). Raise it for larger archives.
      ...(config.partSizeBytes ? { partSize: config.partSizeBytes } : {}),
      params: {
        Bucket: bucket,
        Key: id,
        Body: body,
        ContentType: mimetype,
        ContentDisposition: 'attachment',
        ...(config.storageClass
          ? {
              StorageClass: config.storageClass as StorageClass,
            }
          : {}),
        ...(checksum ? { ChecksumAlgorithm: checksum as ChecksumAlgorithm } : {}),
        ...(config.objectLock
          ? {
              ObjectLockMode: config.objectLock.mode,
              ObjectLockRetainUntilDate: new Date(
                Date.now() + config.objectLock.retainDays * 86_400_000,
              ),
            }
          : {}),
      },
    })

    // [ambiguous-failure fix] Set by `file.abort` below BEFORE calling
    // `s3Upload.abort()`. `@aws-sdk/lib-storage` makes an aborted upload's `done()`
    // REJECT with an AbortError — without this flag that rejection fell into the
    // generic .catch() and was reported via onError, so an intentional cancel
    // masqueraded as a transport failure (and disagreed with the filesystem bond,
    // whose old `.end()`-based abort instead resolved as a false success — the two
    // swappable providers gave opposite answers for the same operation). Normalized:
    // neither bond ever calls onError NOR resolves uploadPromise for an abort; both
    // reject it with the same UploadAbortedError. See @molecule/api-uploads'
    // AbortHandler remarks for the full contract.
    let aborted = false

    const uploadPromise = new Promise<void>((resolve, reject) => {
      s3Upload
        .done()
        .then((result) => {
          delete file.abort
          delete file.uploadPromise
          file.uploaded = true
          file.location = result.Location
          resolve()
        })
        .catch((error) => {
          delete file.abort
          delete file.uploadPromise
          if (aborted) {
            reject(new UploadAbortedError())
            return
          }
          trackBondFailure({ bond: 'uploads-s3', operation: 'upload', error })
          onError(error)
          reject(error)
        })
    })

    const file: File = {
      id,
      fieldname,
      filename,
      encoding,
      mimetype,
      size: 0,
      stream,
      abort: async () => {
        aborted = true
        await s3Upload.abort()
      },
      uploadPromise,
      uploaded: false,
    }

    stream.on(`data`, (data) => {
      file.size += data.length
    })

    stream.on(`end`, () => {
      delete file.stream
    })

    stream.on(`error`, (err) => {
      const error = err instanceof Error ? err : new Error(String(err))
      // Tear down the piped body too, or the SDK upload would wait forever on a
      // stream that will never end. `destroy(error)` re-emits the error on
      // `body`; if the SDK hasn't attached its own error listener yet, an
      // unlistened `error` event would crash the process — so handle it here.
      body.once(`error`, (_error) => {
        // Intentionally ignored: this is the same error we just passed to
        // destroy() and already surface via onError(error) below.
      })
      body.destroy(error)
      onError(error)
    })

    stream.on(`limit`, () => {
      onError(
        new Error(
          t('uploads.error.streamLimitReached', undefined, {
            defaultValue: 'Stream limit reached.',
          }),
        ),
      )
    })

    return file
  }

  const abortUpload = async (file: File): Promise<void> => {
    if (file.stream) {
      file.stream.removeAllListeners(`data`)
      file.stream.removeAllListeners(`limit`)
      file.stream.removeAllListeners(`end`)
      delete file.stream
    }

    if (file.abort) {
      try {
        await file.abort()
      } catch (error) {
        logger.error(`Error aborting S3 upload (id: ${file.id})`, error)
      }
    }

    delete file.abort
    delete file.uploadPromise
  }

  const deleteFile = async (id: string): Promise<void> => {
    try {
      await getClient().send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: id,
        }),
      )
    } catch (error) {
      trackBondFailure({ bond: 'uploads-s3', operation: 'delete', error })
      logger.error(`Error deleting S3 file (id: ${id})`, error)
      throw error
    }
  }

  const getFile = async (id: string): Promise<NodeJS.ReadableStream | null> => {
    try {
      const response = await getClient().send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: id,
        }),
      )
      return (response.Body as NodeJS.ReadableStream) ?? null
    } catch (error) {
      // GetFileHandler contract (and parity with the filesystem bond): resolve `null`
      // when the file does not exist so callers can 404, and THROW only for real
      // failures (bad credentials, missing bucket, network). Without this, a deleted
      // key was indistinguishable from an outage. Keyed on the SDK's NoSuchKey error
      // name — NoSuchBucket and auth errors still throw (they are misconfiguration,
      // not "file not found", and must stay loud).
      if ((error as { name?: string }).name === 'NoSuchKey') {
        return null
      }
      trackBondFailure({ bond: 'uploads-s3', operation: 'get', error })
      throw error
    }
  }

  const headFile = async (id: string): Promise<S3FileHead | null> => {
    try {
      const response = await getClient().send(
        new HeadObjectCommand({
          Bucket: config.bucket,
          Key: id,
        }),
      )
      return {
        bytes: response.ContentLength ?? 0,
        ...(response.ETag ? { etag: response.ETag } : {}),
        ...(response.LastModified ? { lastModified: response.LastModified } : {}),
      }
    } catch (error) {
      // A HEAD response has no body, so a missing key surfaces as `NotFound`
      // rather than `NoSuchKey`; accept both — but a missing BUCKET is a 404
      // with no body too (R93-B3), so it is told apart with a HEAD on the
      // bucket and thrown, exactly like getFile and describeBucketProtection.
      const name = (error as { name?: string }).name
      if (name === 'NotFound' || name === 'NoSuchKey') {
        try {
          await getClient().send(new HeadBucketCommand({ Bucket: config.bucket }))
        } catch (bucketError) {
          const bucketName = (bucketError as { name?: string }).name
          if (bucketName === 'NotFound' || bucketName === 'NoSuchBucket') {
            const missing = Object.assign(
              new Error(`The bucket "${config.bucket}" does not exist.`),
              { name: 'NoSuchBucket', cause: bucketError },
            )
            trackBondFailure({ bond: 'uploads-s3', operation: 'head', error: missing })
            throw missing
          }
          // Any other failure to look at the bucket: the object answer stands.
        }
        return null
      }
      trackBondFailure({ bond: 'uploads-s3', operation: 'head', error })
      throw error
    }
  }

  const describeBucketProtection = async (): Promise<BucketProtection> => {
    const bucket = config.bucket
    if (!bucket) throw new Error(missingBucketMessage(envDriven))
    let versioning: BucketProtection['versioning']
    try {
      const res = await getClient().send(new GetBucketVersioningCommand({ Bucket: bucket }))
      versioning =
        res.Status === 'Enabled' ? 'Enabled' : res.Status === 'Suspended' ? 'Suspended' : 'off'
    } catch (error) {
      trackBondFailure({ bond: 'uploads-s3', operation: 'describe-protection', error })
      throw error
    }
    let objectLock: BucketProtection['objectLock']
    try {
      const res = await getClient().send(new GetObjectLockConfigurationCommand({ Bucket: bucket }))
      const cfg = res.ObjectLockConfiguration
      const retention = cfg?.Rule?.DefaultRetention
      objectLock = {
        enabled: cfg?.ObjectLockEnabled === 'Enabled',
        ...(retention?.Mode ? { mode: retention.Mode as ObjectLockRetentionMode } : {}),
        ...(retention?.Days !== undefined ? { days: retention.Days } : {}),
        ...(retention?.Years !== undefined ? { years: retention.Years } : {}),
      }
    } catch (error) {
      // A bucket created without Object Lock answers ObjectLockConfigurationNotFoundError
      // (404). That is a fact about the bucket, not a failure to look; everything
      // else (AccessDenied, NoSuchBucket, network) is a failure and must stay loud.
      const e = error as { name?: string; $metadata?: { httpStatusCode?: number } }
      if (
        e.name === 'ObjectLockConfigurationNotFoundError' ||
        (e.$metadata?.httpStatusCode === 404 && e.name !== 'NoSuchBucket')
      ) {
        objectLock = { enabled: false }
      } else {
        trackBondFailure({ bond: 'uploads-s3', operation: 'describe-protection', error })
        throw error
      }
    }
    return { versioning, objectLock, checkedAt: new Date().toISOString() }
  }

  return {
    get client() {
      return getClient()
    },
    get bucket() {
      return config.bucket
    },
    upload,
    abortUpload,
    deleteFile,
    getFile,
    headFile,
    describeBucketProtection,
  }
}

/**
 * Creates an S3 upload provider bound to one store — its own client, endpoint,
 * credentials, bucket, storage class and key prefix — independent of the
 * default env-configured `provider` and of every other instance.
 *
 * The client is created on first use. Upload, abort, delete and get behave
 * exactly like the default provider's, against this store. With `objectLock`,
 * every upload carries its own Object Lock retention.
 *
 * @param config - The store configuration.
 * @returns A provider for that store.
 */
export const createProvider = (config: S3UploadsConfig): S3UploadProvider => {
  if (config.objectLock) {
    const { mode, retainDays } = config.objectLock
    if (mode !== 'COMPLIANCE' && mode !== 'GOVERNANCE') {
      throw new Error(`objectLock.mode must be 'COMPLIANCE' or 'GOVERNANCE' (got ${String(mode)}).`)
    }
    if (!Number.isFinite(retainDays) || retainDays <= 0) {
      throw new Error(
        `objectLock.retainDays must be a positive number (got ${String(retainDays)}).`,
      )
    }
    if (config.checksumAlgorithm === 'none') {
      throw new Error(
        "checksumAlgorithm 'none' cannot be combined with objectLock: S3 rejects an Object Lock upload without a checksum.",
      )
    }
  }
  return buildProvider(
    { ...config, ...(config.objectLock ? { objectLock: { ...config.objectLock } } : {}) },
    false,
  )
}

/**
 * The default, env-configured instance. Built on first use so `process.env` has
 * been populated (e.g. by `resolveAll()`) first. Its bucket is read from the
 * environment at every operation, and its client options on first client use.
 */
let _default: S3UploadProvider | null = null

/**
 * Returns the default env-configured provider instance.
 * @returns The default instance.
 */
function getDefault(): S3UploadProvider {
  if (!_default) {
    const snapshot = (): S3UploadsConfig => configFromEnv()
    const envConfig = {
      get bucket() {
        return getBucketName()
      },
      get region() {
        return snapshot().region
      },
      get endpoint() {
        return snapshot().endpoint
      },
      get forcePathStyle() {
        return snapshot().forcePathStyle
      },
      get connectionTimeoutMs() {
        return snapshot().connectionTimeoutMs
      },
      get socketTimeoutMs() {
        return snapshot().socketTimeoutMs
      },
      get maxAttempts() {
        return snapshot().maxAttempts
      },
    } as S3UploadsConfig
    _default = buildProvider(envConfig, true)
  }
  return _default
}

/** Lazily-initialized S3 client proxy for the default provider. Property access is forwarded to the real client on first use. */
export const s3Client: S3Client = new Proxy({} as S3Client, {
  get(_, prop, receiver) {
    return Reflect.get(getDefault().client, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    return Reflect.set(getDefault().client, prop, value)
  },
})

/**
 * Streams a file upload to S3 (default provider) using the `@aws-sdk/lib-storage` multipart Upload utility.
 * Creates a UUID key in the configured S3 bucket and pipes the readable stream into it.
 * @param fieldname - The form field name this file was submitted under.
 * @param stream - The readable stream of the uploaded file data.
 * @param info - File metadata (filename, encoding, mimeType) from the multipart parser.
 * @param onError - Callback invoked if the S3 upload fails or the stream exceeds its size limit.
 * @returns A `File` object with the upload's ID, metadata, and a `uploadPromise` that resolves on completion.
 */
export const upload = (
  fieldname: string,
  stream: NodeJS.ReadableStream,
  info: FileInfo,
  onError: (error: Error) => void,
): File => getDefault().upload(fieldname, stream, info, onError)

/**
 * Aborts an in-progress S3 upload (default provider). Removes stream listeners and calls the S3 multipart abort.
 * Rejects the file's `uploadPromise` with `UploadAbortedError` — never as a success, and
 * never routed through the `upload()` call's `onError` (parity with the filesystem bond).
 * @param file - The `File` object returned by `upload()`.
 */
export const abortUpload = (file: File): Promise<void> => getDefault().abortUpload(file)

/**
 * Deletes a file from S3 (default provider) by its key using `DeleteObjectCommand`.
 * @param id - The UUID file identifier (S3 object key).
 */
export const deleteFile = (id: string): Promise<void> => getDefault().deleteFile(id)

/**
 * Downloads a file from S3 (default provider) by its key using `GetObjectCommand`.
 * @param id - The UUID file identifier (S3 object key).
 * @returns A readable stream of the file contents, or `null` if the file does not exist.
 */
export const getFile = (id: string): Promise<NodeJS.ReadableStream | null> =>
  getDefault().getFile(id)

/**
 * The default S3 upload provider, configured from the environment (see
 * `configFromEnv()`): stores files in the bucket named by `AWS_S3_BUCKET`
 * (or `BUCKET_NAME`). Use `createProvider()` for additional stores.
 */
export const provider: S3UploadProvider = {
  get client() {
    return getDefault().client
  },
  get bucket() {
    return getDefault().bucket
  },
  upload,
  abortUpload,
  deleteFile,
  getFile,
  headFile: (id: string) => getDefault().headFile(id),
  describeBucketProtection: () => getDefault().describeBucketProtection(),
}
