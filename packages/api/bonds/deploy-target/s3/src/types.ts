/**
 * Types for the S3-compatible static-site deploy target.
 *
 * @module
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface — read by the env-configured {@link provider} only;
     * `createS3DeployTarget(config)` takes everything as arguments.
     */
    export interface ProcessEnv {
      /** Bucket the sites are published to. */
      DEPLOY_TARGET_S3_BUCKET?: string
      /**
       * Public URL the bucket's objects are readable at, without a trailing
       * slash (`https://<bucket>.fly.storage.tigris.dev`,
       * `https://pub-<id>.r2.dev`, `https://<bucket>.s3.amazonaws.com`).
       */
      DEPLOY_TARGET_S3_PUBLIC_URL?: string
      /** S3 API endpoint for S3-compatible stores; unset for AWS S3. */
      DEPLOY_TARGET_S3_ENDPOINT?: string
      /**
       * Region.
       *
       * @default auto
       */
      DEPLOY_TARGET_S3_REGION?: string
      /** Access key id with write access to the bucket. */
      DEPLOY_TARGET_S3_ACCESS_KEY_ID?: string
      /** Secret access key for {@link DEPLOY_TARGET_S3_ACCESS_KEY_ID}. */
      DEPLOY_TARGET_S3_SECRET_ACCESS_KEY?: string
      /** `'true'` for path-style addressing (MinIO). */
      DEPLOY_TARGET_S3_FORCE_PATH_STYLE?: string
    }
  }
}

/** The subset of an S3 client this target uses — an `S3Client` satisfies it. */
export interface S3SendClient {
  /**
   * Send one S3 command.
   *
   * @param command - The command.
   * @returns The command's output.
   */
  send(command: unknown): Promise<unknown>
}

/** Configuration for {@link createS3DeployTarget}. */
export interface S3DeployTargetConfig {
  /** Bucket the sites are published to. It must be publicly readable. */
  bucket: string
  /**
   * Public URL the bucket's objects are readable at (no trailing slash
   * needed): the object `sites/a/b/manifest.json` must be served at
   * `${publicBaseUrl}/sites/a/b/manifest.json`.
   */
  publicBaseUrl: string
  /** S3 API endpoint for S3-compatible stores; omit for AWS S3. */
  endpoint?: string
  /** Region (`auto` for Tigris and R2). Default `auto`. */
  region?: string
  /** Path-style addressing (MinIO). Default `false`. */
  forcePathStyle?: boolean
  /** Access key id; omit to use the SDK's default credential chain. */
  accessKeyId?: string
  /** Secret access key; required with `accessKeyId`. */
  secretAccessKey?: string
  /** Key prefix every site lives under. Default `sites/`. */
  keyPrefix?: string
  /** Provider name recorded on each release. Default `s3`. */
  name?: string
  /** Parallel uploads per deploy. Default 16. */
  concurrency?: number
  /**
   * A client to use instead of building one — for tests, or to share a
   * client the application already configured.
   */
  client?: S3SendClient
}
