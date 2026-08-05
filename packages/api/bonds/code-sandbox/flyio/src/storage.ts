/**
 * The S3-compatible object store that holds Fly sandbox templates.
 *
 * Fly has no `docker commit`: it PULLS images from a registry and cannot produce
 * one from a running Machine, and the Machines API has no file-transfer endpoint
 * at all (its whole surface is enumerated in
 * https://docs.machines.dev/openapi.json — `exec` is the only way in or out). So a
 * template here is a tar archive in object storage, and the bytes move between the
 * sandbox and that store DIRECTLY over presigned URLs; this module is only the
 * control plane's half — presigning, metadata, enumeration and deletion.
 *
 * **Storage is bond configuration, never interface surface.** Nothing about
 * buckets or endpoints appears in `@molecule/api-code-sandbox`. This mirrors the
 * Docker bond's `templateRegistry`/`templateRegistryAuth` pattern: the capability
 * belongs to the provider, the address belongs to the operator.
 *
 * On Fly the natural store is Tigris — "Tigris is S3-compatible, so any AWS SDK
 * works — point it at `https://t3.storage.dev`"
 * (https://fly.io/docs/tigris/) — and `fly storage create` exports
 * `BUCKET_NAME`, `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID` and
 * `AWS_SECRET_ACCESS_KEY`, which are read here as fallbacks so a Fly-provisioned
 * bucket needs no extra configuration. Any S3-compatible endpoint works; the
 * operations used are the six Tigris documents as supported
 * (https://www.tigrisdata.com/docs/api/s3/): PutObject, GetObject, HeadObject,
 * ListObjectsV2, DeleteObject and DeleteObjects.
 *
 * @module
 */

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import type { FlyioConfig } from './types.js'

/** Default key prefix for every object this bond writes. */
export const DEFAULT_TEMPLATE_PREFIX = 'molecule-sandbox-templates'

/**
 * Region sent when none is configured. Tigris (and most S3-compatible stores)
 * accept `auto`; the AWS SDK requires *some* region to build a signature, so this
 * is not optional even against a store that ignores it.
 */
export const DEFAULT_TEMPLATE_REGION = 'auto'

/**
 * AWS's documented ceiling on a SigV4 presigned URL: "If you use the AWS CLI or
 * AWS SDKs, the expiration time can be set as high as 7 days."
 * (https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
 * A larger value is not rejected at signing time — it simply produces a URL S3
 * refuses — so it is clamped here.
 */
export const MAX_PRESIGN_EXPIRY_SECONDS = 7 * 24 * 60 * 60

/** One object as this bond needs to see it. */
export interface StoredObject {
  /** Full key, including the configured prefix. */
  key: string
  /** Size in bytes. */
  size: number
  /** Last-modified timestamp, ISO 8601, or `null` when the store did not report one. */
  lastModified: string | null
}

/**
 * The object-store operations the template capability needs.
 *
 * Declared as an interface so `templates.ts` stays transport-free and its tests
 * can drive a fake store, the same way `exec.ts` takes an injected `RawExec`.
 */
export interface ObjectStore {
  /** Human-readable identification of the store, for error messages. */
  readonly describe: string
  /** Bucket holding the templates. Used to render the opaque `SandboxTemplate.ref`. */
  readonly bucket: string
  /** Key prefix every template object lives under, with no trailing slash. */
  readonly prefix: string
  /**
   * Every object under a prefix, following pagination to the end.
   * THROWS on failure — a caller that deletes must never read a failed query as
   * "nothing is there".
   */
  list(prefix: string): Promise<StoredObject[]>
  /** One object's metadata, or `null` when it does not exist. Throws on any other failure. */
  head(key: string): Promise<StoredObject | null>
  /** An object's body as text, or `null` when it does not exist. Throws on any other failure. */
  getText(key: string): Promise<string | null>
  /** Write a small text object. */
  putText(key: string, body: string, contentType: string): Promise<void>
  /** Delete objects. Deleting a key that is not there is a success. */
  remove(keys: string[]): Promise<void>
  /** A presigned URL a sandbox can `PUT` an archive to. */
  presignPut(key: string, expiresInSeconds: number): Promise<string>
  /** A presigned URL a sandbox can `GET` an archive from. */
  presignGet(key: string, expiresInSeconds: number): Promise<string>
}

/** Resolved connection settings for the template object store. */
interface ResolvedStorage {
  bucket: string
  endpoint: string | undefined
  region: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken: string | undefined
  forcePathStyle: boolean
  prefix: string
}

/**
 * Reads one template-storage setting, preferring explicit config over the
 * environment.
 * @param configured - The value from {@link FlyioConfig}, if any.
 * @param names - Environment variable names to try, in order.
 * @returns The first non-empty value, or `undefined`.
 */
function resolve(configured: string | undefined, names: string[]): string | undefined {
  const explicit = configured?.trim()
  if (explicit) return explicit
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return undefined
}

/**
 * Resolves template-storage settings from config and the environment.
 *
 * Returns `null` when the store is not configured at all, which the template
 * methods turn into an actionable error naming the settings. Partial
 * configuration is treated as unconfigured for the same reason: half a
 * connection cannot be used, and reporting it as a connection failure would
 * point an operator at the network instead of at their settings.
 * @param config - Fly provider configuration.
 * @returns The resolved settings, or `null` when storage is not configured.
 */
export function resolveTemplateStorage(config: FlyioConfig): ResolvedStorage | null {
  const bucket = resolve(config.templateBucket, ['SANDBOX_TEMPLATE_BUCKET', 'BUCKET_NAME'])
  const accessKeyId = resolve(config.templateAccessKeyId, [
    'SANDBOX_TEMPLATE_ACCESS_KEY_ID',
    'AWS_ACCESS_KEY_ID',
  ])
  const secretAccessKey = resolve(config.templateSecretAccessKey, [
    'SANDBOX_TEMPLATE_SECRET_ACCESS_KEY',
    'AWS_SECRET_ACCESS_KEY',
  ])
  if (!bucket || !accessKeyId || !secretAccessKey) return null

  const forcePathStyleRaw = resolve(
    config.templateForcePathStyle === undefined ? undefined : String(config.templateForcePathStyle),
    ['SANDBOX_TEMPLATE_FORCE_PATH_STYLE'],
  )

  return {
    bucket,
    endpoint: resolve(config.templateEndpoint, [
      'SANDBOX_TEMPLATE_ENDPOINT',
      'AWS_ENDPOINT_URL_S3',
    ]),
    region:
      resolve(config.templateRegion, ['SANDBOX_TEMPLATE_REGION', 'AWS_REGION']) ??
      DEFAULT_TEMPLATE_REGION,
    accessKeyId,
    secretAccessKey,
    sessionToken: resolve(config.templateSessionToken, [
      'SANDBOX_TEMPLATE_SESSION_TOKEN',
      'AWS_SESSION_TOKEN',
    ]),
    forcePathStyle: forcePathStyleRaw === 'true',
    prefix: (
      resolve(config.templatePrefix, ['SANDBOX_TEMPLATE_PREFIX']) ?? DEFAULT_TEMPLATE_PREFIX
    ).replace(/\/+$/, ''),
  }
}

/**
 * Reports whether an S3 error means "no such object" rather than "the lookup
 * failed".
 *
 * The distinction is the whole contract for `getTemplate`: absence is an answer
 * the caller acts on by rebuilding, while a failed lookup reported as absence
 * turns a transient store hiccup into a full cold rebuild on every boot.
 * @param error - The thrown error.
 * @returns `true` for a 404 / `NoSuchKey` / `NotFound`.
 */
function isNotFound(error: unknown): boolean {
  const candidate = error as
    { name?: string; $metadata?: { httpStatusCode?: number }; Code?: string } | undefined
  if (candidate?.$metadata?.httpStatusCode === 404) return true
  return candidate?.name === 'NotFound' || candidate?.name === 'NoSuchKey'
}

/**
 * Creates the object store used for templates, or `null` when it is not
 * configured.
 *
 * @param config - Fly provider configuration; every field has an env fallback.
 * @returns An {@link ObjectStore}, or `null` when no bucket/credentials are set.
 */
export function createTemplateStore(config: FlyioConfig): ObjectStore | null {
  const settings = resolveTemplateStorage(config)
  if (!settings) return null

  const client = new S3Client({
    region: settings.region,
    ...(settings.endpoint ? { endpoint: settings.endpoint } : {}),
    forcePathStyle: settings.forcePathStyle,
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
      ...(settings.sessionToken ? { sessionToken: settings.sessionToken } : {}),
    },
    // The SDK's default is `WHEN_SUPPORTED`, which adds `x-amz-checksum-crc32`
    // to every upload. On a PRESIGNED PUT that header becomes part of
    // `X-Amz-SignedHeaders`, so the sandbox's `curl` would have to reproduce it
    // exactly or the signature fails — and S3-compatible stores vary in whether
    // they accept it at all. `WHEN_REQUIRED` is the documented opt-out:
    // https://docs.aws.amazon.com/sdkref/latest/guide/feature-dataintegrity.html
    requestChecksumCalculation: 'WHEN_REQUIRED',
  })

  const expiry = (seconds: number): number =>
    Math.max(1, Math.min(Math.floor(seconds), MAX_PRESIGN_EXPIRY_SECONDS))

  return {
    describe: `s3://${settings.bucket}/${settings.prefix} at ${settings.endpoint ?? `region ${settings.region}`}`,
    bucket: settings.bucket,
    prefix: settings.prefix,

    async list(prefix: string): Promise<StoredObject[]> {
      const objects: StoredObject[] = []
      let token: string | undefined
      do {
        const page = await client.send(
          new ListObjectsV2Command({
            Bucket: settings.bucket,
            Prefix: prefix,
            ...(token ? { ContinuationToken: token } : {}),
          }),
        )
        for (const entry of page.Contents ?? []) {
          if (!entry.Key) continue
          objects.push({
            key: entry.Key,
            size: typeof entry.Size === 'number' ? entry.Size : 0,
            lastModified: entry.LastModified ? entry.LastModified.toISOString() : null,
          })
        }
        // `IsTruncated` alone is not enough: a truncated page without a token
        // would loop forever on the same page.
        token = page.IsTruncated ? page.NextContinuationToken : undefined
      } while (token)
      return objects
    },

    async head(key: string): Promise<StoredObject | null> {
      try {
        const response = await client.send(
          new HeadObjectCommand({ Bucket: settings.bucket, Key: key }),
        )
        return {
          key,
          size: typeof response.ContentLength === 'number' ? response.ContentLength : 0,
          lastModified: response.LastModified ? response.LastModified.toISOString() : null,
        }
      } catch (error) {
        if (isNotFound(error)) return null
        throw error
      }
    },

    async getText(key: string): Promise<string | null> {
      try {
        const response = await client.send(
          new GetObjectCommand({ Bucket: settings.bucket, Key: key }),
        )
        return (await response.Body?.transformToString()) ?? ''
      } catch (error) {
        if (isNotFound(error)) return null
        throw error
      }
    },

    async putText(key: string, body: string, contentType: string): Promise<void> {
      await client.send(
        new PutObjectCommand({
          Bucket: settings.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      )
    },

    async remove(keys: string[]): Promise<void> {
      // DeleteObjects caps at 1000 keys per request
      // (https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObjects.html).
      for (let index = 0; index < keys.length; index += 1000) {
        const batch = keys.slice(index, index + 1000)
        if (batch.length === 0) continue
        await client.send(
          new DeleteObjectsCommand({
            Bucket: settings.bucket,
            Delete: { Objects: batch.map((key) => ({ Key: key })), Quiet: true },
          }),
        )
      }
    },

    async presignPut(key: string, expiresInSeconds: number): Promise<string> {
      // No ContentType and no metadata: anything set here joins
      // `X-Amz-SignedHeaders` and must then be reproduced byte-for-byte by the
      // sandbox's `curl`. Only `host` is signed, so the upload is a plain PUT.
      return getSignedUrl(client, new PutObjectCommand({ Bucket: settings.bucket, Key: key }), {
        expiresIn: expiry(expiresInSeconds),
      })
    },

    async presignGet(key: string, expiresInSeconds: number): Promise<string> {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: settings.bucket, Key: key }), {
        expiresIn: expiry(expiresInSeconds),
      })
    },
  }
}
