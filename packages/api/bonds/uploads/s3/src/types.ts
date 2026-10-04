/**
 * Type definitions for the S3 upload provider.
 *
 * @module
 */

import type { UploadedFile } from '@molecule/api-uploads'

/** S3 Object Lock retention mode. */
export type ObjectLockRetentionMode = 'COMPLIANCE' | 'GOVERNANCE'

export type { FileInfo, UploadedFile } from '@molecule/api-uploads'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * The AWS API access key ID.
       */
      AWS_ACCESS_KEY_ID?: string

      /**
       * The AWS API secret access key.
       */
      AWS_SECRET_ACCESS_KEY?: string

      /**
       * The AWS region for S3.
       *
       * @default us-east-1
       */
      AWS_S3_REGION?: string

      /**
       * The S3 bucket name for uploads.
       */
      AWS_S3_BUCKET?: string

      /**
       * Optional S3 service endpoint override. Set this to target an
       * S3-compatible service such as Cloudflare R2, MinIO, DigitalOcean
       * Spaces, or a credential broker. When unset, the SDK resolves the
       * default AWS regional endpoint.
       */
      AWS_S3_ENDPOINT?: string

      /**
       * Set to `'true'` to use path-style bucket addressing
       * (`endpoint/bucket/key`) instead of virtual-hosted-style
       * (`bucket.endpoint/key`). Required by some S3-compatible services
       * (e.g. MinIO). When unset, the SDK's default addressing is used.
       */
      AWS_S3_FORCE_PATH_STYLE?: string

      /**
       * Milliseconds to wait for the S3 connection to open.
       *
       * @default 10000
       */
      AWS_S3_CONNECTION_TIMEOUT_MS?: string

      /**
       * Milliseconds of socket inactivity before an S3 request is abandoned.
       *
       * @default 60000
       */
      AWS_S3_SOCKET_TIMEOUT_MS?: string
    }
  }
}

/**
 * S3-uploaded file extending the core UploadedFile with S3-specific abort capabilities.
 */
export interface File extends UploadedFile {
  /**
   * Aborts the in-progress S3 upload.
   */
  abort?: () => Promise<void>
}

/**
 * Configuration for one S3-compatible store, passed to `createProvider()`.
 *
 * Every field except `bucket` is optional; an omitted field falls back to the
 * AWS SDK's own default (region, endpoint, credentials) or to this bond's
 * default (timeouts, retries). Nothing here is read from the environment — use
 * `configFromEnv()` for the env-driven configuration the default `provider`
 * uses.
 */
export interface S3UploadsConfig {
  /** The bucket every object of this store is written to and read from. */
  bucket: string

  /**
   * The bucket's region.
   *
   * @default 'us-east-1'
   */
  region?: string

  /**
   * Service endpoint of an S3-compatible store (Cloudflare R2, MinIO,
   * DigitalOcean Spaces, Tigris, Backblaze B2, …). When unset the SDK resolves
   * the AWS regional endpoint. Outbound proxy agents are resolved against this
   * endpoint (or the regional one), so a `NO_PROXY`-listed internal host keeps
   * connecting directly.
   */
  endpoint?: string

  /** Use path-style addressing (`endpoint/bucket/key`), required by e.g. MinIO. */
  forcePathStyle?: boolean

  /**
   * Static credentials for this store. When set they take precedence over the
   * SDK's default chain (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, profiles,
   * instance roles); when unset that chain is used.
   */
  credentials?: {
    /** Access key id. */
    accessKeyId: string
    /** Secret access key. */
    secretAccessKey: string
    /** Session token, for temporary credentials. */
    sessionToken?: string
  }

  /**
   * Storage class sent as `StorageClass` on every upload (e.g. `STANDARD_IA`,
   * `GLACIER_IR`). When unset the bucket's default class applies.
   */
  storageClass?: string

  /**
   * Prefix prepended to every object key this store mints (e.g. `backups/`).
   * The id returned by `upload()` includes it, so ids stay opaque: pass them
   * back to `getFile`/`deleteFile`/`headFile` unchanged.
   */
  keyPrefix?: string

  /**
   * Per-object S3 Object Lock retention, asserted on every upload this provider
   * makes (single PutObject and multipart alike): `ObjectLockMode` is `mode` and
   * `ObjectLockRetainUntilDate` is `retainDays` days after the moment that
   * upload starts. Use it for a backup/immutable bucket, so retention does not
   * depend only on the bucket's default rule (which a full-access credential can
   * shorten or remove).
   *
   * The bucket must have been created with Object Lock enabled; a PUT carrying
   * lock headers to a bucket without it is rejected. An Object Lock PUT also
   * needs a content checksum (Content-MD5 or an `x-amz-checksum-*`) — see
   * `checksumAlgorithm`. When `objectLock` is set and `checksumAlgorithm` is not,
   * `ChecksumAlgorithm: 'CRC32'` is sent explicitly, so an
   * `AWS_REQUEST_CHECKSUM_CALCULATION=WHEN_REQUIRED` environment cannot drop it.
   * `createProvider()` throws if `retainDays` is not a positive number or if
   * `checksumAlgorithm` is `'none'`.
   */
  objectLock?: {
    /** `COMPLIANCE`: no one can shorten or remove it. `GOVERNANCE`: holders of `s3:BypassGovernanceRetention` can. */
    mode: ObjectLockRetentionMode
    /** Retention length in days, counted from each upload's start. */
    retainDays: number
  }

  /**
   * Checksum algorithm sent as `ChecksumAlgorithm` on every upload. When unset the
   * AWS SDK default applies (`requestChecksumCalculation: 'WHEN_SUPPORTED'`: a
   * CRC32 checksum sent as a trailer). `'none'` turns the SDK's automatic
   * checksum off for this store (`requestChecksumCalculation: 'WHEN_REQUIRED'`),
   * for an S3-compatible store that rejects checksum trailers; it cannot be
   * combined with `objectLock`.
   *
   * S3-compatible stores differ in which checksums (and whether streamed
   * trailers) they accept — test an Object Lock upload against the real store
   * before relying on it (e.g. Hetzner Object Storage). `'SHA256'` is the most
   * portable explicit choice.
   */
  checksumAlgorithm?: 'CRC32' | 'CRC32C' | 'SHA1' | 'SHA256' | 'none'

  /**
   * Milliseconds to wait for a connection to open.
   *
   * @default 10000
   */
  connectionTimeoutMs?: number

  /**
   * Milliseconds of socket inactivity before a request is abandoned.
   *
   * @default 60000
   */
  socketTimeoutMs?: number

  /**
   * Total attempts per request, including the first.
   *
   * @default 3
   */
  maxAttempts?: number
}
