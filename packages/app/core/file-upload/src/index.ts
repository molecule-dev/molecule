/**
 * File upload core interface for molecule.dev.
 *
 * Provides a framework-agnostic contract for file uploads with progress
 * tracking, validation, drag-and-drop support, and multi-file queues.
 * Bond a provider (e.g. `@molecule/app-file-upload-filepond`) at startup,
 * then use {@link createUploader} anywhere.
 *
 * @example
 * ```typescript
 * import { createUploader } from '@molecule/app-file-upload'
 *
 * const uploader = createUploader({
 *   destination: { url: '/api/upload' },
 *   validation: { maxSize: 10 * 1024 * 1024, acceptedTypes: ['image/*'] },
 *   multiple: true,
 *   autoUpload: true,
 *   events: {
 *     onComplete: (file) => console.log(`Uploaded: ${file.name}`),
 *   },
 * })
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
