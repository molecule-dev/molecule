/**
 * Type definitions for the S3 upload provider.
 *
 * @module
 */

import type { UploadedFile } from '@molecule/api-uploads'

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
