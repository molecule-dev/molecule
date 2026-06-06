/**
 * File dropzone.
 *
 * Exports `<FileDropzone>` — drag-drop + click-to-browse with accept/size filtering.
 *
 * @example
 * ```tsx
 * import { FileDropzone } from '@molecule/app-file-dropzone-react'
 *
 * <FileDropzone
 *   accept="image/*"
 *   multiple={false}
 *   maxSize={5 * 1024 * 1024}
 *   onFiles={(files) => uploadAvatar(files[0])}
 *   onRejected={(files) => showError(`${files[0].name} is too large or unsupported`)}
 * />
 * ```
 * @module
 */

export * from './FileDropzone.js'
