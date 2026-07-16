/**
 * File dropzone — drag-drop + click-to-browse file picker with
 * accept / max-size filtering. Pure UI: it emits the chosen `File[]`
 * and the host app performs the actual upload.
 *
 * Exports `<FileDropzone>` and its `FileDropzoneProps`.
 *
 * @example
 * ```tsx
 * import { FileDropzone } from '@molecule/app-file-dropzone-react'
 *
 * function AvatarUpload() {
 *   return (
 *     <FileDropzone
 *       accept="image/*"
 *       multiple={false}
 *       maxSize={5 * 1024 * 1024}
 *       onFiles={(files) => uploadAvatar(files[0])}
 *       onRejected={(files) => showError(files[0].name)}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * With `multiple={false}` (the default) only the FIRST accepted file is
 * delivered to `onFiles`, even when the user drops several at once.
 *
 * The `accept` filter is a best-effort client-side check (file
 * extension or MIME prefix match) — treat it as UX sugar and always
 * re-validate on the server. Files failing `accept` or `maxSize` go to
 * `onRejected` (both rejection causes arrive in the same callback).
 *
 * Pass `children` to replace the default "Drop files here or click to
 * browse" copy; the default copy translates via
 * `@molecule/app-locales-file-dropzone`.
 *
 * @module
 */

export * from './FileDropzone.js'
