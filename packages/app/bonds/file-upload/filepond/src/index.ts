/**
 * FilePond file upload provider for the molecule file upload interface.
 *
 * Implements `FileUploadProvider` from `@molecule/app-file-upload` using a
 * headless upload engine with validation, progress tracking, concurrency
 * control, and image preview generation following FilePond's patterns.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-file-upload-filepond'
 * import { setProvider } from '@molecule/app-file-upload'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
