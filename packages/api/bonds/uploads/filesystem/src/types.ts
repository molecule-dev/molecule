/**
 * Type definitions for the filesystem upload provider.
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
       * The path for uploaded files, relative to your API's root directory (using `process.cwd()`).
       *
       * Note: For your files to remain on disk indefinitely, your server needs a permanent file system.
       * Many "serverless" deployments have transient file systems, meaning that files written to them will not remain.
       *
       * @example ../uploaded-files
       */
      FILE_UPLOAD_PATH?: string
    }
  }
}

/**
 * Filesystem-uploaded file extending the core UploadedFile with the active write stream.
 */
export interface File extends UploadedFile {
  /**
   * The stream being written to disk.
   */
  upload?: NodeJS.WritableStream
}
