/**
 * Static-site deploy target on any S3-compatible bucket.
 *
 * Layout, per release (all immutable once written):
 *
 * ```
 * <keyPrefix><siteId>/<releaseId>/files/<site-relative path>
 * <keyPrefix><siteId>/<releaseId>/manifest.json      ← written LAST
 * ```
 *
 * The manifest is written after every file, so a release whose manifest exists
 * is complete; a deploy that dies half-way leaves files no manifest names,
 * which nothing serves and the next `remove(siteId, { keepReleaseIds })`
 * reclaims.
 *
 * @module
 */

import { createHash } from 'node:crypto'

import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

import type {
  DeployTargetFile,
  DeployTargetProvider,
  DeployTargetRelease,
  DeployTargetRemoveOptions,
  DeployTargetRequest,
  StaticSiteManifest,
  StaticSiteManifestEntry,
} from '@molecule/api-deploy-target'
import { getProxyAgents } from '@molecule/api-proxy-agent'

import { contentTypeFor } from './content-types.js'
import type { S3DeployTargetConfig, S3SendClient } from './types.js'

/** `siteId` / `releaseId` shape — also what keeps them from escaping their prefix. */
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/

/** Longest site-relative path accepted (S3 keys cap at 1024 bytes including the prefix). */
const MAX_PATH_LENGTH = 800

/** How objects are cached by anything between the bucket and the edge: releases never change. */
const IMMUTABLE = 'public, max-age=31536000, immutable'

/** An error carrying a machine-readable `code`. */
const codedError = (message: string, code: string): Error & { code: string } =>
  Object.assign(new Error(message), { code })

/**
 * Validate a site-relative path. Refused, never normalized: a normalized path
 * is a file the caller did not ask for.
 *
 * @param path - The path.
 * @returns The problem, or `null` when it is fine.
 */
export function invalidSitePath(path: string): string | null {
  if (typeof path !== 'string' || !path.startsWith('/')) return 'must start with "/"'
  if (path.length > MAX_PATH_LENGTH) return `is longer than ${MAX_PATH_LENGTH} characters`
  if (path.endsWith('/')) return 'names a directory, not a file'
  if (path.includes('\\')) return 'contains a backslash'
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(path)) return 'contains a control character'
  const segments = path.slice(1).split('/')
  if (segments.some((s) => s === '' || s === '.' || s === '..')) {
    return 'contains an empty, "." or ".." segment'
  }
  return null
}

/**
 * Normalize a base path to `/x/y` (no trailing slash) or `null`.
 *
 * @param basePath - The base path as given.
 * @returns The normalized base, or `null` for the root.
 */
function normalizeBase(basePath: string | null): string | null {
  if (basePath == null) return null
  const trimmed = basePath.trim().replace(/\/+$/, '')
  if (trimmed === '') return null
  if (!trimmed.startsWith('/') || invalidSitePath(trimmed) !== null) {
    throw codedError(`Invalid basePath "${basePath}"`, 'invalid-request')
  }
  return trimmed
}

/**
 * Run `worker` over `items` with at most `limit` in flight, stopping at the
 * first rejection (in-flight work finishes; nothing new starts).
 *
 * @param items - Work items.
 * @param limit - Parallelism.
 * @param worker - Per-item work.
 */
async function pool<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0
  let failed: unknown = null
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (failed === null && next < items.length) {
      const item = items[next++]
      try {
        await worker(item)
      } catch (error) {
        if (failed === null) failed = error
      }
    }
  })
  await Promise.all(lanes)
  if (failed !== null) throw failed
}

/**
 * Build the S3 client for a config.
 *
 * @param config - Target configuration.
 * @returns The client.
 */
function buildClient(config: S3DeployTargetConfig): S3SendClient {
  const region = config.region || 'auto'
  // The SDK builds its own https.Agent and reads no proxy variable, so on a
  // host whose only egress is a proxy it needs one handed in — resolved
  // against the endpoint actually in use (an internal MinIO in NO_PROXY keeps
  // connecting directly).
  const proxy = getProxyAgents(config.endpoint || `https://s3.${region}.amazonaws.com`)
  return new S3Client({
    region,
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    ...(config.forcePathStyle ? { forcePathStyle: true } : {}),
    ...(config.accessKeyId && config.secretAccessKey
      ? {
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
        }
      : {}),
    // Checksums only where S3 requires them (DeleteObjects): several
    // S3-compatible stores reject the SDK's default CRC32 trailers on PUT.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    ...(proxy ? { requestHandler: proxy } : {}),
  })
}

/**
 * Create a static-site deploy target backed by an S3-compatible bucket.
 *
 * @param config - Bucket, public URL, endpoint and credentials.
 * @returns The target.
 * @throws {Error} When `bucket` or `publicBaseUrl` is missing.
 */
export function createS3DeployTarget(config: S3DeployTargetConfig): DeployTargetProvider {
  if (!config.bucket) throw new Error('createS3DeployTarget: `bucket` is required')
  if (!config.publicBaseUrl) throw new Error('createS3DeployTarget: `publicBaseUrl` is required')
  const bucket = config.bucket
  const publicBase = config.publicBaseUrl.replace(/\/+$/, '')
  const keyPrefix = (config.keyPrefix ?? 'sites/').replace(/^\/+/, '')
  const name = config.name ?? 's3'
  const concurrency = Math.max(1, config.concurrency ?? 16)
  let client: S3SendClient | null = config.client ?? null
  const s3 = (): S3SendClient => (client ??= buildClient(config))

  const siteRoot = (siteId: string): string => `${keyPrefix}${siteId}/`
  const releaseRoot = (siteId: string, releaseId: string): string =>
    `${siteRoot(siteId)}${releaseId}/`
  /** Public URL of an object key, each path segment percent-encoded. */
  const publicUrl = (key: string): string =>
    `${publicBase}/${key.split('/').map(encodeURIComponent).join('/')}`

  /**
   * Every key under a prefix. Throws on a failed listing — never "empty".
   *
   * @param prefix - The key prefix.
   * @returns The keys.
   */
  const listKeys = async (prefix: string): Promise<string[]> => {
    const keys: string[] = []
    let token: string | undefined
    do {
      const page = (await s3().send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
      )) as ListObjectsV2CommandOutput
      for (const item of page.Contents ?? []) if (item.Key) keys.push(item.Key)
      token = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (token)
    return keys
  }

  /**
   * Delete keys in batches of 1000. Throws if the store reports any key it
   * could not delete.
   *
   * @param keys - The keys.
   */
  const deleteKeys = async (keys: readonly string[]): Promise<void> => {
    for (let i = 0; i < keys.length; i += 1000) {
      const batch = keys.slice(i, i + 1000)
      const result = (await s3().send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: batch.map((key) => ({ Key: key })), Quiet: true },
        }),
      )) as { Errors?: Array<{ Key?: string; Code?: string; Message?: string }> }
      if (result.Errors && result.Errors.length > 0) {
        const first = result.Errors[0]
        throw new Error(
          `Could not delete ${result.Errors.length} of ${batch.length} objects ` +
            `(first: ${first.Key} — ${first.Code ?? ''} ${first.Message ?? ''})`,
        )
      }
    }
  }

  const remove = async (siteId: string, options: DeployTargetRemoveOptions = {}): Promise<void> => {
    if (!ID_RE.test(siteId)) throw codedError(`Invalid siteId "${siteId}"`, 'invalid-request')
    const keep = new Set(options.keepReleaseIds ?? [])
    const root = siteRoot(siteId)
    const keys = (await listKeys(root)).filter((key) => {
      const releaseId = key.slice(root.length).split('/')[0]
      return !keep.has(releaseId)
    })
    await deleteKeys(keys)
  }

  const deploy = async (request: DeployTargetRequest): Promise<DeployTargetRelease> => {
    const { siteId, releaseId } = request
    if (!ID_RE.test(siteId)) throw codedError(`Invalid siteId "${siteId}"`, 'invalid-request')
    if (!ID_RE.test(releaseId)) {
      throw codedError(`Invalid releaseId "${releaseId}"`, 'invalid-request')
    }
    const files: readonly DeployTargetFile[] = request.files ?? []
    if (files.length === 0) {
      throw codedError(
        'A static deploy needs the build output, and none was given',
        'invalid-request',
      )
    }
    const seen = new Set<string>()
    for (const file of files) {
      const problem = invalidSitePath(file.path)
      if (problem) {
        throw codedError(`Invalid file path "${file.path}": ${problem}`, 'invalid-request')
      }
      if (seen.has(file.path)) {
        throw codedError(`File "${file.path}" is listed twice`, 'invalid-request')
      }
      seen.add(file.path)
    }
    if (!seen.has('/index.html')) {
      throw codedError(
        'The build output has no /index.html, so the site would have no page to serve — ' +
          'check that the build wrote its output where the deploy reads it',
        'invalid-request',
      )
    }
    const routing = {
      basePath: normalizeBase(request.routing.basePath),
      unmatchedPaths: request.routing.unmatchedPaths,
    }

    const log = async (line: string): Promise<void> => {
      try {
        await request.log?.(line)
      } catch (_error) {
        // A progress sink that fails (a disconnected viewer) must never fail
        // the deploy it is only reporting on.
      }
    }
    const cancelled = async (): Promise<boolean> => Boolean(await request.isCancelled?.())

    const root = releaseRoot(siteId, releaseId)
    const manifestFiles: Record<string, StaticSiteManifestEntry> = {}
    let bytes = 0
    for (const file of files) {
      manifestFiles[file.path] = {
        contentType: contentTypeFor(file.path, file.contentType),
        size: file.body.byteLength,
        etag: createHash('sha256').update(file.body).digest('hex').slice(0, 32),
      }
      bytes += file.body.byteLength
    }

    await log(
      `[deploy-target:${name}] Uploading ${files.length} files ` +
        `(${(bytes / 1024 / 1024).toFixed(2)} MB) to ${bucket}/${root}`,
    )

    /** Remove what THIS deploy wrote, then rethrow — never another release. */
    const abandon = async (error: unknown): Promise<never> => {
      try {
        await deleteKeys(await listKeys(root))
      } catch (cleanupError) {
        await log(
          `[deploy-target:${name}] Could not remove the partial release ${root}: ` +
            `${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
        )
      }
      throw error
    }

    try {
      let uploaded = 0
      await pool(files, concurrency, async (file) => {
        if (uploaded % 32 === 0 && (await cancelled())) {
          throw codedError('Deployment cancelled', 'cancelled')
        }
        await s3().send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: `${root}files${file.path}`,
            Body: file.body,
            ContentType: manifestFiles[file.path].contentType,
            CacheControl: IMMUTABLE,
          }),
        )
        uploaded++
      })
      if (await cancelled()) throw codedError('Deployment cancelled', 'cancelled')

      const manifest: StaticSiteManifest = {
        format: 'molecule-static-site/1',
        siteId,
        releaseId,
        publishedAt: new Date().toISOString(),
        routing,
        files: manifestFiles,
      }
      await s3().send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${root}manifest.json`,
          Body: JSON.stringify(manifest),
          ContentType: 'application/json; charset=utf-8',
          CacheControl: IMMUTABLE,
        }),
      )
    } catch (error) {
      return abandon(error)
    }

    return {
      target: name,
      siteId,
      releaseId,
      origin: {
        kind: 'static-files',
        filesBaseUrl: `${publicUrl(`${root}files`)}/`,
        manifestUrl: publicUrl(`${root}manifest.json`),
      },
      url: null,
      routing,
      fileCount: files.length,
      bytes,
    }
  }

  return { name, hosts: 'static-files', deploy, remove }
}

/** The env-configured target, built on first use. */
let envTarget: DeployTargetProvider | null = null

/**
 * The target configured from `DEPLOY_TARGET_S3_*` env vars, built on first use
 * so the env has been populated (secrets resolved) by then.
 *
 * @returns The target.
 * @throws {Error} When `DEPLOY_TARGET_S3_BUCKET` or `DEPLOY_TARGET_S3_PUBLIC_URL` is unset.
 */
function fromEnv(): DeployTargetProvider {
  if (!envTarget) {
    const env = process.env
    if (!env.DEPLOY_TARGET_S3_BUCKET || !env.DEPLOY_TARGET_S3_PUBLIC_URL) {
      throw new Error(
        'The S3 deploy target is not configured: set DEPLOY_TARGET_S3_BUCKET and ' +
          'DEPLOY_TARGET_S3_PUBLIC_URL (plus DEPLOY_TARGET_S3_ENDPOINT and credentials ' +
          'for an S3-compatible store).',
      )
    }
    envTarget = createS3DeployTarget({
      bucket: env.DEPLOY_TARGET_S3_BUCKET,
      publicBaseUrl: env.DEPLOY_TARGET_S3_PUBLIC_URL,
      endpoint: env.DEPLOY_TARGET_S3_ENDPOINT || undefined,
      region: env.DEPLOY_TARGET_S3_REGION || undefined,
      accessKeyId: env.DEPLOY_TARGET_S3_ACCESS_KEY_ID || undefined,
      secretAccessKey: env.DEPLOY_TARGET_S3_SECRET_ACCESS_KEY || undefined,
      forcePathStyle: env.DEPLOY_TARGET_S3_FORCE_PATH_STYLE === 'true',
    })
  }
  return envTarget
}

/**
 * The S3 deploy target configured from `DEPLOY_TARGET_S3_*` env vars. Use
 * {@link createS3DeployTarget} to pass configuration explicitly instead.
 */
export const provider: DeployTargetProvider = {
  name: 's3',
  hosts: 'static-files',
  deploy: (request) => fromEnv().deploy(request),
  remove: (siteId, options) => fromEnv().remove(siteId, options),
}
